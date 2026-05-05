!include "MUI2.nsh"

Name "Mohassibe Accounting System"
OutFile "App setup.exe"
InstallDir "$PROGRAMFILES64\Mohassibe"
RequestExecutionLevel admin

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_LANGUAGE "French"
!insertmacro MUI_LANGUAGE "English"

Section "Install"
    SetOutPath "$INSTDIR"
    
    ; Include everything from the packaged Electron app
    File /r "dist_temp\App-win32-x64\*.*"
    
    ; Create shortcuts
    CreateShortcut "$DESKTOP\Mohassibe.lnk" "$INSTDIR\App.exe"
    CreateDirectory "$SMPROGRAMS\Mohassibe"
    CreateShortcut "$SMPROGRAMS\Mohassibe\Mohassibe.lnk" "$INSTDIR\App.exe"
    CreateShortcut "$SMPROGRAMS\Mohassibe\Uninstall.lnk" "$INSTDIR\uninstall.exe"
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
    
    ; Registry keys
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MohassibeStandalone" "DisplayName" "Mohassibe (Standalone)"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MohassibeStandalone" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MohassibeStandalone" "DisplayIcon" "$INSTDIR\App.exe"
SectionEnd

Section "Uninstall"
    Delete "$DESKTOP\Mohassibe.lnk"
    RMDir /r "$SMPROGRAMS\Mohassibe"
    RMDir /r "$INSTDIR"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\MohassibeStandalone"
SectionEnd
