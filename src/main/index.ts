import { app, shell, BrowserWindow, ipcMain, powerMonitor } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import sendPowerAlert from './mail'

let mainWindow // 全局引用
function getLogPath(): string {
  // 获取用户数据目录
  return join(app.getPath('userData'), 'power-log.json')
}

function readLogFromFile(): object {
  // 读取用户数据目录下的 power-log.json 文件
  const logPath = getLogPath()
  if (fs.existsSync(logPath)) {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'))
  }
  return {}
}

// IPC 通信接口
ipcMain.handle('read-log', () => {
  return readLogFromFile()
})

ipcMain.handle('write-log', (_, log) => {
  writeLogToFile(log)
})

function writeLogToFile(log): void {
  const logPath = getLogPath()
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8')
}

ipcMain.handle('get-power-status', () => {
  const currentStatus = powerMonitor.isOnBatteryPower() ? '断电' : '来电'
  return currentStatus
})

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  powerMonitor.on('on-ac', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('power-status', '来电')
      sendPowerAlert('电力监控', `电力恢复，当前时间：${new Date().toLocaleString()}`)
    }
  })

  powerMonitor.on('on-battery', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('power-status', '断电')
      sendPowerAlert('电力监控', `断电，当前时间：${new Date().toLocaleString()}`)
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
