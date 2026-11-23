; ═══════════════════════════════════════════════════════════════════
;  PDFPro — Instalador NSIS personalizado (one-click, por usuario)
;  Basado en la plantilla de electron-builder con un cambio clave:
;  el desinstalador se genera con la instrucción estándar WriteUninstaller
;  (en tiempo de instalación) en lugar de incrustar uno pre-compilado,
;  lo que permite compilar el instalador desde Linux/macOS sin Wine.
; ═══════════════════════════════════════════════════════════════════

Var newStartMenuLink
Var oldStartMenuLink
Var newDesktopLink
Var oldDesktopLink
Var oldShortcutName
Var oldMenuDirectory

!include "common.nsh"
!include "MUI2.nsh"
!include "multiUser.nsh"
!include "allowOnlyOneInstallerInstance.nsh"

; instalación por usuario (no requiere administrador)
RequestExecutionLevel user

Var appExe
Var launchLink

!include "oneClick.nsh"

!insertmacro addLangs

Function .onInit
  Call setInstallSectionSpaceRequired

  SetOutPath $INSTDIR
  ${LogSet} on

  !insertmacro check64BitAndSetRegView

  !insertmacro ALLOW_ONLY_ONE_INSTALLER_INSTANCE

  !insertmacro initMultiUser
FunctionEnd

!include "installUtil.nsh"
!include "installer.nsh"

Section "install" INSTALL_SECTION_ID
  InitPluginsDir

  ${IfNot} ${Silent}
    SetDetailsPrint none
  ${endif}

  StrCpy $appExe "$INSTDIR\${APP_EXECUTABLE_FILENAME}"

  ; debe llamarse antes de uninstallOldVersion
  !insertmacro setLinkVars

  !ifdef HEADER_ICO
    File /oname=$PLUGINSDIR\installerHeaderico.ico "${HEADER_ICO}"
  !endif
  ${IfNot} ${Silent}
    !ifdef HEADER_ICO
      SpiderBanner::Show /MODERN /ICON "$PLUGINSDIR\installerHeaderico.ico"
    !else
      SpiderBanner::Show /MODERN
    !endif

    FindWindow $0 "#32770" "" $hwndparent
    FindWindow $0 "#32770" "" $hwndparent $0
    GetDlgItem $0 $0 1000
    SendMessage $0 ${WM_SETTEXT} 0 "STR:$(installing)"

    StrCpy $1 $hwndparent
    System::Call 'user32::ShutdownBlockReasonCreate(${SYSTYPE_PTR}r1, w "$(installing)")'
  ${endif}
  !insertmacro CHECK_APP_RUNNING

  Var /GLOBAL keepShortcuts
  StrCpy $keepShortcuts "false"
  !insertMacro setIsTryToKeepShortcuts
  ${if} $isTryToKeepShortcuts == "true"
    ReadRegStr $R1 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" KeepShortcuts

    ${if} $R1 == "true"
    ${andIf} ${FileExists} "$appExe"
      StrCpy $keepShortcuts "true"
    ${endIf}
  ${endif}

  !insertmacro uninstallOldVersion SHELL_CONTEXT
  !insertmacro handleUninstallResult SHELL_CONTEXT

  ${if} $installMode == "all"
    !insertmacro uninstallOldVersion HKEY_CURRENT_USER
    !insertmacro handleUninstallResult HKEY_CURRENT_USER
  ${endIf}

  SetOutPath $INSTDIR

  !ifdef UNINSTALLER_ICON
    File /oname=uninstallerIcon.ico "${UNINSTALLER_ICON}"
  !endif

  ; ── cuerpo de installApplicationFiles (variante embebida, no web) ──
  !insertmacro extractEmbeddedAppPackage
  ; electron siempre usa datos de aplicación por usuario
  ${if} $installMode == "all"
    SetShellVarContext current
  ${endif}
  !insertmacro copyFile "$EXEPATH" "$LOCALAPPDATA\${APP_INSTALLER_STORE_FILE}"
  ${if} $installMode == "all"
    SetShellVarContext all
  ${endif}

  ; ── desinstalador estándar NSIS (sustituye al pre-compilado) ──
  WriteUninstaller "$INSTDIR\${UNINSTALL_FILENAME}"

  !insertmacro registryAddInstallInfo
  !insertmacro addStartMenuLink $keepShortcuts
  !insertmacro addDesktopLink $keepShortcuts

  ${if} ${FileExists} "$newStartMenuLink"
    StrCpy $launchLink "$newStartMenuLink"
  ${else}
    StrCpy $launchLink "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  ${endif}

  !ifmacrodef registerFileAssociations
    !insertmacro registerFileAssociations
  !endif

  !ifmacrodef customInstall
    !insertmacro customInstall
  !endif

  !macro doStartApp
    ; para que la ventana de la app no quede detrás
    HideWindow
    !insertmacro StartApp
  !macroend

  !ifdef RUN_AFTER_FINISH
    ${ifNot} ${Silent}
    ${orIf} ${isForceRun}
      !insertmacro doStartApp
    ${endIf}
  !else
    ${if} ${isForceRun}
      !insertmacro doStartApp
    ${endIf}
  !endif
  !insertmacro quitSuccess
SectionEnd

Function setInstallSectionSpaceRequired
  !insertmacro setSpaceRequired ${INSTALL_SECTION_ID}
FunctionEnd

; ── lógica del desinstalador (se compila DENTRO de este instalador) ──
; Copia local de uninstaller.nsh con un.checkAppRunning adaptado (ver cabecera del archivo)
!include "${BUILD_RESOURCES_DIR}/uninstaller-pdfpro.nsh"
