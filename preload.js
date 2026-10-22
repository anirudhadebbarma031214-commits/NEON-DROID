const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("neon", {
 getConfig:()=>ipcRenderer.invoke("config:get"), saveConfig:c=>ipcRenderer.invoke("config:save",c),
 pick:kind=>ipcRenderer.invoke("pick",kind), avds:()=>ipcRenderer.invoke("avds"),
 start:c=>ipcRenderer.invoke("start",c), stop:()=>ipcRenderer.invoke("stop"),
 adb:a=>ipcRenderer.invoke("adb",a), tap:p=>ipcRenderer.invoke("tap",p),
 swipe:p=>ipcRenderer.invoke("swipe",p), install:f=>ipcRenderer.invoke("install",f),
 external:u=>ipcRenderer.invoke("external",u),
 onLog:fn=>ipcRenderer.on("log",(_,msg)=>fn(msg))
});