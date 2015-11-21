var ExeQueue = require('../exequeue.js');
var equ = new ExeQueue( { maxConcurrent: 10 } );

Promise.resolve('STARTING TESTS.')
.then( function(ret) { console.log(ret); return equ.run('sleep', ['1'] ) } )
.then( function(ret) { console.log(ret); return equ.run('sleep', ['1'] ) } )
.then( function(ret) { console.log(ret); return equ.run('s=2; date -u; sleep $s; date -u; echo "Hello." 1>&2',
														null,
														{ useShell: true, noShellEscape: true, storeStdout: true, storeStderr: true } ) } )
.then( function(ret) { console.log(ret); return equ.run('tr',
														['a', 'b'],
														{ input: 'aaaaa', storeStdout: true } ) } )
.then( function(ret) { console.log(ret); return Promise.resolve('TESTS END. ALL OK!') } )
.catch( function(err) { console.log(err); } );
