const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);
let win, emulatorProcess = null, serial = "emulator-5554", configPath;
const defaults = { emulatorPath:"", adbPath:"", avdName:"", ramMb:3072, cores:2, gpu:"auto", width:1280, height:720 };
function config(){ try{return {...defaults,...JSON.parse(fs.readFileSync(configPath,"utf8"))};}catch{return {...defaults};} }
function findExe(kind, configured){
  if(configured && fs.existsSync(configured)) return configured;
  const relative = kind==="adb" ? "platform-tools\\adb.exe" : "emulator\\emulator.exe";
  const roots=[process.env.ANDROID_SDK_ROOT,process.env.ANDROID_HOME,path.join(os.homedir(),"AppData","Local","Android","Sdk")].filter(Boolean);
  for(const root of roots){const p=path.join(root,relative);if(fs.existsSync(p))return p;}
  return kind;
}
async function run(file,args,timeout=15000){
  try{const r=await execFileAsync(file,args,{timeout,windowsHide:true,maxBuffer:2*1024*1024});return {ok:true,output:(r.stdout||r.stderr||"").trim()};}
  catch(e){return {ok:false,output:String(e.stderr||e.stdout||e.message||"Command failed").trim()};}
}
function createWindow(){
  win=new BrowserWindow({width:1200,height:780,minWidth:900,minHeight:600,backgroundColor:"#080d18",title:"NEON DROID",webPreferences:{preload:path.join(__dirname,"preload.js"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.loadFile("index.html");
}
app.whenReady().then(()=>{configPath=path.join(app.getPath("userData"),"settings.json");createWindow();app.on("activate",()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});});
app.on("before-quit",()=>{if(emulatorProcess&&!emulatorProcess.killed)emulatorProcess.kill();});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
ipcMain.handle("config:get",()=>config());
ipcMain.handle("config:save",(_,c)=>{const next={...defaults,...c};fs.writeFileSync(configPath,JSON.stringify(next,null,2));return next;});
ipcMain.handle("pick",async(_,kind)=>{const filters=kind==="apk"?[{name:"Android APK",extensions:["apk"]}]:[{name:"Executable",extensions:["exe"]}];const r=await dialog.showOpenDialog(win,{properties:["openFile"],filters});return r.canceled?null:r.filePaths[0];});
ipcMain.handle("avds",async()=>{const c=config(),r=await run(findExe("emulator",c.emulatorPath),["-list-avds"]);return {...r,avds:r.ok?r.output.split(/\r?\n/).filter(Boolean):[]};});
ipcMain.handle("start",async(_,options)=>{
 if(emulatorProcess&&!emulatorProcess.killed)return {ok:false,output:"An emulator is already running."};
 const c={...config(),...options};if(!c.avdName)return {ok:false,output:"Create an Android Virtual Device first."};
 const emu=findExe("emulator",c.emulatorPath),adb=findExe("adb",c.adbPath);serial="emulator-5554";
 const args=["-avd",c.avdName,"-memory",String(c.ramMb||3072),"-cores",String(c.cores||2),"-gpu",c.gpu||"auto","-port","5554","-no-boot-anim"];
 emulatorProcess=spawn(emu,args,{windowsHide:true,stdio:"ignore"});
 emulatorProcess.on("error",e=>win?.webContents.send("log", "Launch error: "+e.message));
 emulatorProcess.on("exit",code=>{win?.webContents.send("log","Emulator exited: "+code);emulatorProcess=null;});
 const deadline=Date.now()+180000;
 while(Date.now()<deadline){
  if(!emulatorProcess||emulatorProcess.killed)return {ok:false,output:"Emulator stopped during startup. Check Android SDK and AVD."};
  const s=await run(adb,["-s",serial,"get-state"],5000);
  if(s.ok&&s.output.includes("device")){const b=await run(adb,["-s",serial,"shell","getprop","sys.boot_completed"],5000);if(b.ok&&b.output==="1")return {ok:true,output:"Android is ready: "+serial};}
  await new Promise(r=>setTimeout(r,1500));
 }
 return {ok:false,output:"Boot timed out. Check virtualization, the AVD, and emulator logs."};
});
ipcMain.handle("stop",async()=>{const c=config(),r=await run(findExe("adb",c.adbPath),["-s",serial,"emu","kill"]);if(emulatorProcess&&!emulatorProcess.killed)emulatorProcess.kill();emulatorProcess=null;return {ok:r.ok,output:r.output||"Stop requested."};});
ipcMain.handle("adb",async(_,action)=>{
 const c=config(),adb=findExe("adb",c.adbPath);
 const commands={devices:["devices"],version:["-s",serial,"shell","getprop","ro.build.version.release"],screen:["-s",serial,"shell","wm","size"],back:["-s",serial,"shell","input","keyevent","4"],home:["-s",serial,"shell","input","keyevent","3"],recent:["-s",serial,"shell","input","keyevent","187"]};
 return commands[action]?run(adb,commands[action]):{ok:false,output:"Unsupported command."};
});
ipcMain.handle("tap",async(_,p)=>{const c=config(),adb=findExe("adb",c.adbPath);return run(adb,["-s",serial,"shell","input","tap",String(Math.max(0,Math.min(10000,Number(p.x)||0))),String(Math.max(0,Math.min(10000,Number(p.y)||0)))]);});
ipcMain.handle("swipe",async(_,p)=>{const c=config(),adb=findExe("adb",c.adbPath);const v=[p.x1,p.y1,p.x2,p.y2,p.duration||250].map(n=>String(Math.max(0,Math.min(10000,Number(n)||0))));return run(adb,["-s",serial,"shell","input","swipe",...v]);});
ipcMain.handle("install",async(_,file)=>{if(!file||!fs.existsSync(file)||path.extname(file).toLowerCase()!==".apk")return {ok:false,output:"Choose a valid APK file."};const c=config();return run(findExe("adb",c.adbPath),["-s",serial,"install","-r",file],120000);});
ipcMain.handle("external",(_,url)=>{if(typeof url==="string"&&url.startsWith("https://"))return shell.openExternal(url);});
