import test from "node:test";
import assert from "node:assert/strict";
import { toAlert, toMeasurement, toSensorChannels } from "../src/aim-ui/adapters.js";

test("missing prediction stays missing and Set10 never falls back to label judgment", () => {
  const record = {set:10, wear:null, status:{level:"waiting"}, label:{wear:150,type:"flank_wear"}, prediction:null};
  const result = toMeasurement(record, {name:"tool.png",url:"/real/tool.png"}, "2023-01-01");
  assert.equal(result.status,"pending"); assert.equal(result.predictedWear,null);
  assert.equal(result.judgedWear,null); assert.equal(result.basis,"prediction");
  assert.equal(result.image.url,"/real/tool.png"); assert.equal(result.image.filename,"tool.png");
});
test("zero wear is valid and acknowledgment eligibility comes from the server", () => {
  const record = {id:"monitoring:42",set:6,status:{level:"warning"},source:"라벨 마모량",wear:0,canAcknowledge:false,prediction:{predicted:80},cycleNumber:3};
  const result = toAlert(record);assert.equal(result.judgedWear,0);assert.equal(result.canAcknowledge,false);
  assert.equal(result.cycleNumber,3);assert.equal(result.original,record);assert.equal(result.basis,"label");
});
test("raw channels retain extrema and actual timestamps while bounding display samples", () => {
  const rows = Array.from({length:10000},(_,i)=>({ms:1700000000000+i,values:[1,2,3,4]}));
  rows[4321].values[0]=99;rows[4322].values[0]=-90;
  const channels=toSensorChannels(rows,1700000000000);
  assert.equal(channels.length,4);assert(channels.every(c=>c.samples.length<=500));
  assert(channels[0].samples.some(p=>p.time===4.321&&p.value===99));
  assert(channels[0].samples.some(p=>p.time===4.322&&p.value===-90));
  for(const channel of channels)assert(channel.samples.every((p,i,a)=>i===0||p.time>=a[i-1].time));
});
test("empty sensors have no invented waveform", () => {
  assert(toSensorChannels().every(c=>c.samples.length===0));
});
