import test from "node:test";
import assert from "node:assert/strict";
import { loadHistorySensor } from "../src/utils/historySensor.js";
import { getCuttingMarkers } from "../src/utils/cuttingSegmentMarkers.js";
import { toSensorChannels } from "../src/aim-ui/adapters.js";

const api="https://example.test";
const source="/api/sensors/set11/historical.csv";
const csv=Array.from({length: 100}, (_, i) =>
  [i, i*2, i*3, i*4, i*5, `2026-01-01T00:00:${String(Math.floor(i/10)).padStart(2,"0")}.${i%10}00`].join(",")
).join("\n");
const boundary={status:"ok",start_seconds:2.1,end_seconds:7.6};

test("historical source gets Python markers and fixed full-file ranges on all four graphs",async t=>{
  const calls=[];
  t.mock.method(globalThis,"fetch",async url=>{
    calls.push(String(url));return calls.length===1?new Response(csv):Response.json(boundary);
  });
  const rows=await loadHistorySensor(source,api,new AbortController().signal);
  assert.equal(rows.length,100);
  assert.deepEqual(calls,[api+source,api+source+"/cutting-segment"]);
  const early=toSensorChannels(rows.slice(0,30),rows[0].ms,rows);
  const late=toSensorChannels(rows.slice(60),rows[0].ms,rows);
  for(let i=0;i<4;i++){
    assert.deepEqual(early[i].changeMarkers,[2.1,7.6]);
    assert.deepEqual(early[i].yRange,late[i].yRange);
  }
});
test("failed boundary request retains the historical waveform without invented boundaries",async t=>{
  let count=0;
  t.mock.method(console,"warn",()=>{});
  t.mock.method(globalThis,"fetch",async()=>++count===1?new Response(csv):new Response("failed",{status:503}));
  const rows=await loadHistorySensor(source,api,new AbortController().signal);
  assert.equal(rows.length,100);assert.deepEqual(getCuttingMarkers(rows),[]);
});
test("missing historical CSV is an explicit error, never replaced with a live file",async t=>{
  const fetch=t.mock.method(globalThis,"fetch",async()=>new Response("missing",{status:404}));
  await assert.rejects(loadHistorySensor(source,api,new AbortController().signal),/센서 CSV/);
  assert.equal(fetch.mock.calls.length,1);
});
test("invalid historical CSV fails before any boundary lookup",async t=>{
  const fetch=t.mock.method(globalThis,"fetch",async()=>new Response("bad,csv"));
  await assert.rejects(loadHistorySensor(source,api,new AbortController().signal));
  assert.equal(fetch.mock.calls.length,1);
});
test("late rows after returning to live monitoring are discarded",async t=>{
  const controller=new AbortController();let count=0;
  t.mock.method(globalThis,"fetch",async()=>{
    if(++count===1)return new Response(csv);
    controller.abort();return Response.json(boundary);
  });
  assert.deepEqual(await loadHistorySensor(source,api,controller.signal),[]);
});
test("cancellation during initial CSV fetch never starts a boundary request",async t=>{
  const controller=new AbortController();
  const fetch=t.mock.method(globalThis,"fetch",async()=>{
    controller.abort();return new Response(csv);
  });
  assert.deepEqual(await loadHistorySensor(source,api,controller.signal),[]);
  assert.equal(fetch.mock.calls.length,1);
});
