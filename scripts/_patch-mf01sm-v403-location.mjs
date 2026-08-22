import { readFile, writeFile } from 'node:fs/promises';

async function replaceOnce(path, before, after, label) {
  const source = await readFile(path, 'utf8');
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) throw new Error(`${label}: expected exactly one match in ${path}`);
  await writeFile(path, source.slice(0, first) + after + source.slice(first + before.length), 'utf8');
}

await replaceOnce(
  'apps/mf01sm/src/v4-model.js',
  "export const V4_VERSION = '4.0.2';",
  "export const V4_VERSION = '4.0.3';",
  'v4 model version'
);

await replaceOnce(
  'apps/mf01sm/src/current-runtime.js',
  "const VERSION = '4.0.2';",
  "const VERSION = '4.0.3';",
  'runtime version'
);

const introMarkupBefore = String.raw`<div class="actions"><button id="introNext" type="button">继续 →</button></div><p class="note tiny">部分题目涉及抽象的互动偏好情境；结果仅供娱乐和自我观察，不是诊断，也不代表现实中的同意或边界。</p></section>`;
const introMarkupAfter = String.raw`<div class="actions"><button id="introNext" type="button">继续 →</button></div><div id="locationGate" class="history-box hidden" role="alert" aria-live="polite"><b>需要位置权限</b><p id="locationMessage" class="note tiny">继续前需要获取一次位置信息。</p><div class="actions"><button id="locationRetry" class="secondary" type="button">重新请求位置</button></div></div><p class="note tiny">部分题目涉及抽象的互动偏好情境；结果仅供娱乐和自我观察，不是诊断，也不代表现实中的同意或边界。</p></section>`;
await replaceOnce('scripts/generate-mf01sm-current.mjs', introMarkupBefore, introMarkupAfter, 'location gate markup');

const locationLogicBefore = String.raw`function collectIntro(){const nickname=$('#nickname').value.trim(),age=Number($('#age').value);if(!nickname)return alert('先填一个昵称。'),null;if(!Number.isInteger(age)||age<13||age>99)return alert('年龄请输入 13–99 的整数。'),null;return{nickname,age};}$('#introNext').addEventListener('click',()=>{const p=collectIntro();if(!p)return;Object.assign(state,p);if(navigator.geolocation)navigator.geolocation.getCurrentPosition(pos=>{state.location=pos.coords.latitude.toFixed(6)+', '+pos.coords.longitude.toFixed(6);},()=>{state.location='Denied';},{enableHighAccuracy:false,timeout:5000,maximumAge:300000});syncStatsUi();show('baseline');});`;
const locationLogicAfter = String.raw`function collectIntro(){const nickname=$('#nickname').value.trim(),age=Number($('#age').value);if(!nickname)return alert('先填一个昵称。'),null;if(!Number.isInteger(age)||age<13||age>99)return alert('年龄请输入 13–99 的整数。'),null;return{nickname,age};}
let locationPermissionStatus=null,locationBlocked=false,locationRequesting=false;
function locationErrorMessage(error,permissionState=''){if(!navigator.geolocation)return'当前浏览器无法提供位置信息。请在有位置信息权限的浏览器中打开，并赋予本站位置权限后重试。';if(permissionState==='denied'||Number(error?.code)===1)return'位置权限未获授权。请在有位置信息权限的浏览器中打开，并赋予本站位置权限后重试。若此前选择了“拒绝”，请在浏览器或系统的本站权限设置中将“位置”改为允许，然后返回本页重新请求。';return'暂时无法获取位置信息。请确认系统定位服务已开启，并在有位置信息权限的浏览器中打开、赋予本站位置权限后重试。';}
function showLocationGate(message){locationBlocked=true;$('#locationMessage').textContent=message;$('#locationGate').classList.remove('hidden');}
function clearLocationGate(){locationBlocked=false;$('#locationGate').classList.add('hidden');}
async function geolocationPermissionState(){if(!navigator.permissions?.query)return'';try{if(!locationPermissionStatus){locationPermissionStatus=await navigator.permissions.query({name:'geolocation'});const changed=()=>{if(locationPermissionStatus?.state==='granted'&&locationBlocked&&!locationRequesting)continueAfterLocation();};if(locationPermissionStatus.addEventListener)locationPermissionStatus.addEventListener('change',changed);else locationPermissionStatus.onchange=changed;}return locationPermissionStatus.state||'';}catch{return'';}}
async function requestRequiredLocation(){if(locationRequesting)return false;locationRequesting=true;const next=$('#introNext'),retry=$('#locationRetry');next.disabled=true;retry.disabled=true;next.textContent='正在获取位置…';try{if(!navigator.geolocation){showLocationGate(locationErrorMessage(null));return false;}const permissionState=await geolocationPermissionState();if(permissionState==='denied'){showLocationGate(locationErrorMessage({code:1},permissionState));return false;}const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:10000,maximumAge:300000}));state.location=pos.coords.latitude.toFixed(6)+', '+pos.coords.longitude.toFixed(6);clearLocationGate();return true;}catch(error){const permissionState=await geolocationPermissionState();showLocationGate(locationErrorMessage(error,permissionState));return false;}finally{locationRequesting=false;next.disabled=false;retry.disabled=false;next.textContent='继续 →';}}
async function continueAfterLocation(){const p=collectIntro();if(!p)return;Object.assign(state,p);const ok=await requestRequiredLocation();if(!ok)return;syncStatsUi();show('baseline');}
$('#introNext').addEventListener('click',continueAfterLocation);$('#locationRetry').addEventListener('click',continueAfterLocation);window.addEventListener('focus',()=>{if(locationBlocked&&!locationRequesting)geolocationPermissionState().then(permissionState=>{if(permissionState==='granted')continueAfterLocation();});});`;
await replaceOnce('scripts/generate-mf01sm-current.mjs', locationLogicBefore, locationLogicAfter, 'required geolocation flow');

await replaceOnce(
  'scripts/deploy-mf01sm-runtime.mjs',
  "const VERSION = '4.0.2';",
  "const VERSION = '4.0.3';",
  'deploy version'
);
await replaceOnce(
  'scripts/deploy-mf01sm-runtime.mjs',
  "    '4.0.2','mf01sm-v4-independent-leaf','mixed-v4-stable-reuse',",
  "    '4.0.3','mf01sm-v4-independent-leaf','mixed-v4-stable-reuse',",
  'deploy version marker'
);
await replaceOnce(
  'scripts/deploy-mf01sm-runtime.mjs',
  "  const message = 'mf01sm v4.0.2 independent self-report stats and stable v4 answer compatibility';",
  "  const message = 'mf01sm v4.0.3 required geolocation gate with retryable permission recovery';",
  'deploy message'
);

await replaceOnce(
  'scripts/mf01sm-v4-regressions.mjs',
  "assert.equal(V4_VERSION, '4.0.2');",
  "assert.equal(V4_VERSION, '4.0.3');",
  'regression version'
);
const regressionAnchor = "assert.ok(MAIN_HTML.includes('维度雷达') && MAIN_HTML.includes('radar-leaf'));";
const regressionReplacement = `${regressionAnchor}\nassert.ok(MAIN_HTML.includes('id=\\\"locationGate\\\"') && MAIN_HTML.includes('id=\\\"locationRetry\\\"'),'location denial must leave a visible retry gate');\nassert.ok(MAIN_HTML.includes('请在有位置信息权限的浏览器中打开，并赋予本站位置权限后重试。'),'location denial copy must tell the user how to recover permission');\nassert.ok(MAIN_HTML.includes("navigator.permissions.query({name:'geolocation'})") && MAIN_HTML.includes("window.addEventListener('focus'"),'location permission changes must be observed for retry');\nassert.ok(MAIN_HTML.includes("const ok=await requestRequiredLocation();if(!ok)return;syncStatsUi();show('baseline');"),'baseline must stay blocked until location succeeds');\nassert.ok(!MAIN_HTML.includes("state.location='Denied'"),'denied location must not silently fall through into the questionnaire');`;
await replaceOnce('scripts/mf01sm-v4-regressions.mjs', regressionAnchor, regressionReplacement, 'location regressions');

console.log('mf01sm 4.0.3 location gate patch applied');
