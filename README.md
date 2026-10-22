# NEON DROID — Windows Edition

A lightweight Windows desktop launcher for Android gaming by ANI STUDIO.

## Current features
- Dark gaming dashboard
- Detect and launch locally installed Android Virtual Devices (AVDs)
- Choose guest RAM, CPU cores, and graphics mode
- ADB status and device list
- APK installation
- Tap, swipe, Back, Home, and Recent Apps controls
- Android version and display-size checks
- Local settings and Windows installer/portable build

## Required setup
This is a desktop wrapper, not a standalone hypervisor. Install Android Studio from https://developer.android.com/studio, then install Android Emulator and Android SDK Platform-Tools in SDK Manager. Create an Android Virtual Device (AVD) in Device Manager and download a system image. Start NEON DROID and refresh the AVD list.

If the SDK is in a custom folder, use Settings to select emulator.exe and adb.exe. Typical SDK location is under the Windows user's AppData\Local\Android\Sdk folder.

## Build locally
Install Node.js LTS, then run:
- npm install
- npm start
- npm run dist

## GitHub Actions
The workflow builds a Windows NSIS installer and portable executable. Download the artifacts from the completed Actions run.

## Limitations of this starter release
Advanced real-time keymapping, mouse-look, gamepad support, multi-instance management, clipboard synchronization, shared folders, embedded emulator display, and automatic guest resolution switching are not implemented yet. The controls shown in the UI are functional ADB tools when an emulator is running. Play Store is not bundled. Use official images according to their terms.

Performance depends on host CPU, GPU, memory, drivers, guest image, and game requirements. This project does not bypass game anti-cheat or DRM.
