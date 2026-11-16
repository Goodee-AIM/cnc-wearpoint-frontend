import test from 'node:test';
import assert from 'node:assert/strict';
import {planPairs, playlistPosition, imageFiles, sensorFiles} from '../src/utils/manualPlaylist.js';
const file=(name,path='')=>({name,webkitRelativePath:path});
test('folder selection ignores other formats and pairs equal stems in natural order',()=>{
 const images=imageFiles([file('frame10.PNG'),file('notes.txt'),file('frame2.jpg')]);
 const sensors=sensorFiles([file('frame2.csv'),file('frame10.CSV'),file('x.pdf')]);
 const result=planPairs(images,sensors);
 assert.deepEqual(result.map(p=>[p.image.name,p.sensorIndex]),[['frame2.jpg',0],['frame10.PNG',1]]);
});
test('ambiguous and unrelated filenames are never guessed, one explicit pair still works',()=>{
 assert.equal(planPairs([file('one.png')],[file('two.csv')])[0].sensorIndex,0);
 const result=planPairs([file('one.png'),file('two.png')],[file('one.csv','a/one.csv'),file('one.csv','b/one.csv')]);
 assert.deepEqual(result.map(p=>p.sensorIndex),[-1,-1]);
});
test('playback crosses each file boundary then wraps at the end of the whole playlist',()=>{
 const items=[{duration_ms:1000},{duration_ms:2000},{duration_ms:3000}];
 assert.deepEqual(playlistPosition(999,items),{index:0,elapsed:999});
 assert.deepEqual(playlistPosition(1000,items),{index:1,elapsed:0});
 assert.deepEqual(playlistPosition(3001,items),{index:2,elapsed:1});
 assert.deepEqual(playlistPosition(6000,items),{index:0,elapsed:0});
 assert.deepEqual(playlistPosition(14000,items),{index:1,elapsed:1000});
 assert.deepEqual(playlistPosition(0,[]),{index:0,elapsed:0});
});
