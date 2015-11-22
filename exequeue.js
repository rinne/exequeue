/*
 *  ExeQueue
 *
 *  ExeQueue is an elaborate promise based wrapper for executing and
 *  queuing child processes. The maximum number of concurrent
 *  processes can be configured. Optional input can be passed to the
 *  process and process output (stdout and stderr) can be either
 *  discarded or returned when the execution promise is resolved.
 *
 *  Major distinct feature is a possibility to share process
 *  executions. If a command (e.g. "do-something -i /tmp/fhjkd -o
 *  /tmp/dfhjw) is already running (or queuing) and flagged as shared,
 *  the execution of the same command can optionally join waiting for
 *  the completion of already running (or queuing) process and share
 *  the result instead of executing the process instance of its own.
 *
 *  Copyright (C) 2015 Timo J. Rinne <tri@iki.fi>
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License version 2 as
 *  published by the Free Software Foundation.
 */

var ExeQueue = function(options) {
	if (typeof(options) !== 'object') {
		if ((options === undefined) || (options === null)) {
			options = {};
		} else {
			throw new Error("Invalid options.");
		}
	}
	var defaults = {
		maxConcurrent: undefined,
		shell: undefined
	};
	options = {
		maxConcurrent: ((options.hasOwnProperty('maxConcurrent') && (options.maxConcurrent !== undefined)) ?
						options.maxConcurrent : defaults.maxConcurrent),
		shell: ((options.hasOwnProperty('shell') && (options.shell !== undefined))
				? options.shell : defaults.shell)
	};
	if (options.maxConcurrent === null) {
		options.maxConcurrent = undefined;
	}
	if (options.maxConcurrent !== undefined) {
		options.maxConcurrent = parseFloat(options.maxConcurrent);
		if (! (Number.isInteger(options.maxConcurrent) && (options.maxConcurrent > 0))) {
			throw new Error("Invalid maxConcurrent in options.");
		}
	}
	if ((options.shell === undefined) || (options.shell === null) || (options.shell === '')) {
		var envShell = process.env.SHELL;
		if ((typeof (envShell) === 'string') && (envShell !== '')) {
			options.shell = envShell;
		} else {
			options.shell = '/bin/sh';
		}
	}
	this.options = options;
	this.idCnt = 0;
	this.waitMap = new Map();
	this.runMap = new Map();
};

function progGenericError(message) {
	var rv = {
		error: (message !== undefined) ? message : "Unknown error.",
		exitCode: -1,
		signal: null,
		errno: null,
		stdout: undefined,
		stderr: undefined
	};
	return rv;
}

function progExecuteWaiting(equ) {
	if (equ.waitMap.size < 1) {
		return false;
	}
	var prog = equ.waitMap.values().next().value;
	equ.waitMap.delete(prog.key);
	progExecuteInt(equ, prog);
	equ.runMap.set(prog.key, prog);
	return true;
}

function progExecuteInt(equ, prog) {
	var spawn = require('child_process').spawn;
	var spawnOpts = {};
	if (prog.hasOwnProperty('cwd')) {
		spawnOpts.cwd = prog.cwd;
	}
	if (prog.hasOwnProperty('env')) {
		spawnOpts.env = prog.env;
	}
	prog.child = spawn(prog.command, prog.args, spawnOpts);
	prog.child.on('close', function(exitCode, signal) {
		if (prog.timeout) {
			clearTimeout(prog.timeout);
			prog.timeout = null;
		}
		if (prog.child) {
			prog.child = null;
			equ.runMap.delete(prog.key);
			if (exitCode === 0) {
				prog.completion.forEach(function(c) { c.resolve( { exitCode: 0, stdout: prog.stdout, stderr: prog.stderr } ); } );
			} else {
				var error = {
					error: (signal ?
							("Program terminated by signal" +
							 (((signal === 'SIGTERM') && (prog.killReason !== undefined)) ? (" because of " + prog.killReason + ".") : ".")) :
							"Program terminated by abnormal exit code."),
					exitCode: exitCode,
					signal: signal,
					errno: null,
					stdout: prog.stdout,
					stderr: prog.stderr
				};
				prog.completion.forEach(function(c) { c.reject(error); } );
			}
			progExecuteWaiting(equ);
		}
	} );
	prog.child.on('error', function(error) {
		if (prog.timeout) {
			clearTimeout(prog.timeout);
			prog.timeout = null;
		}
		if (prog.child) {
			prog.child = null;
			equ.runMap.delete(prog.key);
			var error = progGenericError("Program execution failed.");
			prog.completion.forEach(function(c) { c.reject(error); } );
			progExecuteWaiting(equ);
		}
	} );
	prog.child.stdout.on('data', function (data) { if (prog.stdout !== undefined) { prog.stdout += data; } } );
	prog.child.stderr.on('data', function (data) { if (prog.stderr !== undefined) { prog.stderr += data; } } );
	prog.child.stdin.on('error', function() { } );
	if (prog.input !== '') {
		prog.child.stdin.write(prog.input);
	}
	prog.child.stdin.end();
	return true;
}

var progKey;
(function() {
	var hash = undefined;
	var alg = 'md5';
    try {
		var createHash = require('crypto').createHash;
        var newHash = function() { return createHash(alg); };
		newHash().update('TEST').digest('hex');
        hash = function(data) {
            return newHash().update(data).digest('hex');
        };
    } catch(exception) {
		console.log(exception);
        hash = null;
    }
	if (hash) {
		progKey = function(prog) {
			return hash(JSON.stringify(prog));
		}
	} else {
		progKey = function(prog) {
			return JSON.stringify(prog);
		}
	}
})();

ExeQueue.prototype.killAll = function() {
	var equ = this;
	equ.waitMap.forEach(function(prog) {
		equ.waitMap.delete(prog.key);
		prog.killReason = 'explicit kill';
		var error = progGenericError("Program execution cancelled because of explicit kill.");
		prog.completion.forEach(function(c) { c.reject(error); } );
	} );
	equ.runMap.forEach(function(prog) {
		prog.killReason = 'explicit kill';
		prog.child.kill('SIGTERM');
	} );
}

ExeQueue.prototype.run = function(command, args, options) {
	var equ = this;
	if (! Array.isArray(args)) {
		args = [];
	}
	if (typeof(options) !== 'object') {
		if ((options === undefined) || (options === null)) {
			options = {};
		} else {
			throw new Error("Invalid options.");
		}
	}
	var defaults = {
		maxTime: undefined,
		shared: false,
		useShell: false,
		noShellEscape: false,
		cwd: process.cwd(),
		env: process.env,
		input: '',
		storeStdout: false,
		storeStderr: false
	};
	options = {
		maxTime: ((options.hasOwnProperty('maxTime') && (options.maxTime !== undefined)) ?
				  options.maxTime : defaults.maxTime),
		shared: ((options.hasOwnProperty('shared') && (options.shared !== undefined)) ?
				 options.shared : defaults.shared) ? true : false,
		useShell: ((options.hasOwnProperty('useShell') && (options.useShell !== undefined)) ?
				   options.useShell : defaults.useShell) ? true : false,
		noShellEscape: ((options.hasOwnProperty('noShellEscape') && (options.noShellEscape !== undefined)) ?
						options.noShellEscape : defaults.noShellEscape) ? true : false,
		input: ((options.hasOwnProperty('input') && (options.input !== undefined)) ?
				options.input : defaults.input),
		cwd: ((options.hasOwnProperty('cwd') && (options.cwd !== undefined)) ?
			  options.cwd : defaults.cwd),
		env: ((options.hasOwnProperty('env') && (options.env !== undefined)) ?
			  options.env : defaults.env),
		storeStderr: ((options.hasOwnProperty('storeStderr') && (options.storeStderr !== undefined)) ?
					  options.storeStderr : defaults.storeStderr) ? true : false,
		storeStdout: ((options.hasOwnProperty('storeStdout') && (options.storeStdout !== undefined)) ?
					  options.storeStdout : defaults.storeStdout) ? true : false
	};
	if (options.noShellEscape && ((! options.useShell) || (args.length > 0))) {
		throw new Error("Conflicting use of noShellEscape in options.");
	}
	if (options.maxTime === null) {
		options.maxTime = undefined;
	}
	if (options.maxTime !== undefined) {
		options.maxTime = parseFloat(options.maxTime);
		if (! (Number.isFinite(options.maxTime) && (options.maxTime > 0.0))) {
			throw new Error("Invalid maxTime in options.");
		}
		if (options.maxTime < 0.001) {
			options.maxTime = 0.001;
		}
	}
	if ((typeof (options.cwd) !== 'string') || (options.cwd.substring(0, 1) !== '/')) {
		throw new Error("Invalid cwd in options.");
	}
	if (typeof (options.env) !== 'object') {
		throw new Error("Invalid env in options.");
	}
	var prog = {
		command: null,
		args: null,
		cwd: options.cwd,
		env: options.env,
		input: ((options.input === undefined) || (options.input === null)) ? '' : options.input,
		stdout: options.storeStdout ? '' : undefined,
		stderr: options.storeStderr ? '' : undefined,
		killReason: undefined
	};
	if (options.useShell) {
		prog.command = equ.options.shell;
		prog.args = [ '-c' ];
		if (options.noShellEscape) {
			prog.args.push(command);
			options.noShellEscape = false;
		} else {
			var shellCommand = "'" +  command.replace(/'/g, "'" + '"' + "'" + '"' + "'") + "'";
			args.forEach(function(arg) { shellCommand += ' ' + "'" + arg.replace(/'/g, "'" + '"' + "'" + '"' + "'") + "'"; } );
			prog.args.push(shellCommand);
		}
		options.useShell = false;
	} else {
		prog.command = command;
		prog.args = args;
	}
	if (! options.shared) {
		prog.id = ++equ.idCnt;
	}
	prog.key = progKey(prog);
	if (options.shared) {
		prog.id = ++equ.idCnt;
	}
	prog.child = null;
	prog.completion = [];
	prog.timeout = null;
	var existingProg = equ.runMap.get(prog.key);
	if (! existingProg) {
		existingProg = equ.waitMap.get(prog.key);
	}
	if (existingProg) {
		prog = existingProg;
	} else {
		if ((equ.options.maxConcurrent === undefined) || (equ.runMap.size < equ.options.maxConcurrent)) {
			progExecuteInt(equ, prog);
		}
		if (options.maxTime) {
			prog.timeout = setTimeout(function() {
				if (prog.child) {
					prog.killReason = 'timeout';
					prog.child.kill('SIGTERM');
				} else {
					prog.killReason = 'timeout';
					if (equ.waitMap.has(prog.key)) {
						equ.waitMap.delete(prog.key);
						var error = progGenericError("Program execution cancelled because of timeout.");
						prog.completion.forEach(function(c) { c.reject(error); } );
					}
				}
				prog.timeout = undefined;
			}, 1000 * options.maxTime);
		}
	}
	var rv = new Promise(function (resolve, reject) {
		prog.completion.push( { resolve: resolve, reject: reject } );
	});
	if (prog.child) {
		equ.runMap.set(prog.key, prog);
	} else {
		equ.waitMap.set(prog.key, prog);
	}
	return rv;
};

module.exports = ExeQueue;
