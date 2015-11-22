ExeQueue
========

Introduction
============

ExeQueue is an elaborate promise based wrapper for executing and
queuing child processes. The maximum number of concurrent processes
can be configured. Optional input can be passed to the process and
process output (stdout and stderr) can be either discarded or returned
when the execution promise is resolved.

Major distinct feature is a possibility to share process
executions. If a command (e.g. "do-something -i /tmp/fhjkd -o
/tmp/dfhjw) is already running (or queuing) and flagged as shared, the
execution of the same command can optionally join waiting for the
completion of already running (or queuing) process and share the
result instead of executing the process instance of its own.

Methods
=======

ExeQueue(options)
-----------------

The constructor method. Options can be omitted, which implies
defaults. Default values for options are:

```js
var options = {

  // Number of concurrent subprocesses is not limited.
  // Allowed override values are integers >= 1
  maxConcurrent: undefined, 

  // Default shell is used. If environment $SHELL is set, 
  // then that value is used as default, otherwise '/bin/sh'
  // is used.
  shell: undefined

};
```

ExeQueue.prototype.killAll()
----------------------------

Kill all running and queuing processes. Associated promises will be
rejected. Running processes are killed with SIGTERM, which means that
it is possible for the subprocess to ignore this signal and continue
execution. The promise is rejected only after the child process
actually terminates.

ExeQueue.prototype.run(command, args, options)
----------------------------------------------

Executes the command with specified arguments. Arguments are
represented as array of strings (args).

Options can be omitted, which implies defaults. Following options are
available:

```js
var options = {

  // Time limit (in seconds) after which the command execution times
  // out. The processes that are still queued at this point are never
  // started and the associated promises are rejected with error. The
  // processes that are actually running, are killed with SIGTERM and the
  // associated promises are rejected once they actually terminate.
  // Default value is undefined.
  // Allowed override values are numbers >= 0.001 (= 1 millisecond)
  maxTime: undefined,

  // If shared is set to true and exactly same process is already
  // running (or queued), new process is not executed (or queued), but
  // instead the result is shared. All promises associated to a single
  // process, are resolved or rejected according to the result of the
  // program execution, once the process terminates.
  // Default is false.
  // Allowed override value is true.
  shared: false,

  // As default, the command is eecuted directly without shell. If
  // useShell is set to true, shell is used instead.
  // Default is false.
  // Allowed override value is true.
  useShell: false,

  // As default, the working directory the subprocess is executed
  // in, is derived from the node process itself. It can be
  // overridden here. Only absolute paths are allowed (i.e. the first
  // character of the string must be /).
  // Default value is undefined.
  // Allowed override value is a non-empty string beginning with
  // slash (/)
  cwd: undefined

  // As default, the environment variables of the subprocess are
  // derived from the node process itself (i.e. process.env). This
  // can be overridden here. In order to pass empty environment, use
  // env = {} instead of env = undefined.
  // Default value is undefined (i.e. use process.env).
  // Allowed override value is an object of environment variable
  // name value pairs.
  env: undefined

  // If shell is used in command processing, the command and
  // parameters are escaped as default and passed to shell as
  // literals. By setting noShellEscape to true, this functionality
  // can be overridden in which case, the the command is passed to
  // the shell unprocessed. This value must not be set, unless
  // useShell is also set to true. If this value is set to true,
  // separate arguments can not be passed to run, but instead entire
  // command line must be passed in command parameter.
  // Default is false.
  // Allowed override value is true (but only uf useShell is true).
  noShellEscape: false,

  // Input to be passed to the process. After the input is passed to
  // the process, the stdin of the process is closed (i.e. EOF sent).
  // Default is '' (i.e. no input is passed).
  // Allowed override value is string or buffer.
  input: '',

  // Input can be passed either as a Buffer object or as a string.
  // If the input is passed as a Buffer object, it's piped to the
  // process as is. If it's passed as a string, it's decoded using
  // the encoding that can be set as inputEncoding. If 'binary' 
  // is used, the input string is converted to buffer unprocessed.
  // If inputEncoding is set to 'buffer', input must be passed
  // as a Buffer object instead of a string.
  // Default value is 'binary'.
  // Allowed override values are: 'buffer', 'ascii', 'utf8',
  // 'utf16le', 'ucs2', 'base64', and 'hex'.
  inputEncoding: 'binary',

  // As default, process output (stdout and stderr) is discarded. This
  // behavior can be overridden in setting storeStdout and/or 
  // storeStderr to true. If set to true, the corresponding output is
  // passed to promise resolve as a string or Buffer object.
  // Default is false.
  // Allowed override value is true (both can be set independently).
  storeStdout: false,
  storeStderr: false,

  // If storeStdout and/or storeStderr is set, the program output
  // is passed to the caller after the process terminates. The format
  // of the data can be set with stdoutEncoding and stderrEncoding
  // options. If the value is 'buffer', the output is passed in
  // a Buffer object without any encoding. If some other encoding
  // is requested, the output is converted to string using
  // the given encoding before it's passed to the caller.
  // Default value is 'utf8'.
  // Allowed override values are: 'buffer', 'binary', 'ascii',
  // 'utf16le', 'ucs2', 'base64', and 'hex' (both can be set
  // independently).
  stdoutEncoding: 'utf8',
  stderrEncoding: 'utf8'

};
```

Example
=======

```js
var ExeQueue = require('exequeue');
var equ = new ExeQueue( { maxConcurrent: 10 } );
Promise.resolve('START')
.then( function(ret) { console.log(ret); return equ.run('sleep', ['1'] ) } )
.then( function(ret) { console.log(ret); return equ.run('s=2; date -u; sleep $s; date -u; echo "Hello." 1>&2',
                                                        null,
                                                        { useShell: true,
                                                          noShellEscape: true,
                                                          storeStdout: true,
                                                          storeStderr: true } ) } )
.then( function(ret) { console.log(ret); return equ.run('env',
                                                        null,
                                                        { env: { foo: 'bar',
                                                                 zap: 'zup' },
                                                          storeStdout: true } ) } )
.then( function(ret) { console.log(ret); return equ.run('pwd',
                                                        null,
                                                        { cwd: '/tmp',
                                                          storeStdout: true } ) } )
.then( function(ret) { console.log(ret); return equ.run('tr',
                                                        ['a', 'b'],
                                                        { input: 'aaaaa',
                                                          storeStdout: true } ) } )
.then( function(ret) { console.log(ret); return Promise.resolve('END') } )
.catch( function(err) { console.log(err); } );
```

Author
======

Timo J. Rinne <tri@iki.fi>


License
=======

GPL-2.0
