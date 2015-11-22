var ExeQueue = require('../exequeue.js');
var equ = new ExeQueue( { maxConcurrent: 10 } );

Promise.resolve('STARTING TESTS.')
.then ( function(ret)  { console.log(ret);
						 var rv = Promise.all( [ equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ),
												 equ.run('true', null, { shared: 1 } ),
												 equ.run('true', null, { shared: 0 } ) ] );
						 /* console.log(equ); */
						 return rv;
					   } )
.then( function(ret) { console.log(ret); return equ.run('sleep', ['1'] ) } )
.then( function(ret) { console.log(ret); return equ.run('sleep', ['1'] ) } )
.then( function(ret) { console.log(ret); return equ.run('env', null, { env: { foo: 'bar', zap: 'zup' }, storeStdout: true } ) } )
.then( function(ret) { console.log(ret); return equ.run('pwd', null, { cwd: '/tmp', storeStdout: true } ) } )
.then( function(ret) { console.log(ret); return equ.run('s=2; date -u; sleep $s; date -u; echo "Hello." 1>&2',
														null,
														{ useShell: true,
														  noShellEscape: true,
														  storeStdout: true,
														  storeStderr: true,
														  stdoutEncoding: 'binary',
														  stderrEncoding: 'buffer' } ) } )
.then( function(ret) { console.log(ret); return equ.run('tr',
														['a', 'b'],
														{ input: 'aaaaa', storeStdout: true } ) } )
.then( function(ret) { console.log(ret); return Promise.resolve('TESTS END. ALL OK!') } )
.then( function(ret) { console.log(ret); } )
.catch( function(err) { console.log('ERROR'); console.log(err); process.exit(1); } );
