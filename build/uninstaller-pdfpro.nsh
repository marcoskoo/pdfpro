Function un.checkAppRunning
  ; ── Variante PDFPro: NO usa !insertmacro CHECK_APP_RUNNING para evitar
  ;    la doble declaración de Var al compilar instalador y desinstalador
  ;    en un mismo ejecutable (las variables ya las declaró el instalador).
  ;    Reutiliza FIND_PROCESS / KILL_PROCESS (sin declaraciones). ──
  StrCpy $CmdPath "$SYSDIR\cmd.exe"
  StrCpy $PowerShellPath "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe"

  ; ¿PowerShell + Get-CimInstance disponibles y sin política restringida?
  nsExec::Exec `"$PowerShellPath" -NoProfile -NonInteractive -C "if (Get-Command Get-CimInstance -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"`
  Pop $0
  ${if} $0 == 0
    nsExec::Exec `"$PowerShellPath" -NoProfile -NonInteractive -C "if ((Get-ExecutionPolicy -Scope Process) -eq 'Restricted') { exit 1 } else { exit 0 }"`
    Pop $0
  ${endIf}
  ${if} $0 != 0
    StrCpy $IsPowerShellAvailable 1
  ${else}
    StrCpy $IsPowerShellAvailable 0
  ${endIf}

  !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK +2
      Quit
    DetailPrint "$(appClosing)"
    !insertmacro KILL_PROCESS "${APP_EXECUTABLE_FILENAME}" 0
    Sleep 300

    StrCpy $R1 0
    pdfpro_un_loop:
      IntOp $R1 $R1 + 1
      !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
      ${if} $R0 == 0
        Sleep 1000
        !insertmacro KILL_PROCESS "${APP_EXECUTABLE_FILENAME}" 1
        !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
        ${if} $R0 == 0
          DetailPrint `Waiting for "${PRODUCT_NAME}" to close.`
          Sleep 2000
        ${else}
          Goto pdfpro_un_done
        ${endif}
      ${else}
        Goto pdfpro_un_done
      ${endif}
      ${if} $R1 > 1
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY pdfpro_un_loop
        Quit
      ${else}
        Goto pdfpro_un_loop
      ${endif}
    pdfpro_un_done:
  ${endif}
FunctionEnd

Function un.onInit
  SetOutPath $INSTDIR
  ${LogSet} on
  
  !insertmacro check64BitAndSetRegView

  # Parse command line for /S flag and set silent mode
  ${GetParameters} $R0
  ${GetOptions} $R0 "/S" $R1
  ${IfNot} ${Errors}
    SetSilent silent
  ${EndIf}
  
  ${If} ${Silent}
    call un.checkAppRunning
  ${else}
    !ifdef ONE_CLICK
      MessageBox MB_OKCANCEL "$(areYouSureToUninstall)" IDOK +2
      Quit

      # one-click installer executes uninstall section in the silent mode, but we must show message dialog if silent mode was not explicitly set by user (using /S flag)
      call un.checkAppRunning
      SetSilent silent
    !endif
  ${endIf}

  !insertmacro initMultiUser

  !ifmacrodef customUnInit
    !insertmacro customUnInit
  !endif
FunctionEnd

Function un.atomicRMDir
  Exch $R0
  Push $R1
  Push $R2
  Push $R3

  StrCpy $R3 "$INSTDIR$R0\*.*"
  FindFirst $R1 $R2 $R3

  loop:
    StrCmp $R2 "" break

    StrCmp $R2 "." continue
    StrCmp $R2 ".." continue

    IfFileExists "$INSTDIR$R0\$R2\*.*" isDir isNotDir

    isDir:
      CreateDirectory "$PLUGINSDIR\old-install$R0\$R2"

      Push "$R0\$R2"
      Call un.atomicRMDir
      Pop $R3

      ${if} $R3 != 0
        Goto done
      ${endIf}

      Goto continue

    isNotDir:
      ClearErrors
      Rename "$INSTDIR$R0\$R2" "$PLUGINSDIR\old-install$R0\$R2"

      # Ignore errors when renaming ourselves.
      StrCmp "$R0\$R2" "${UNINSTALL_FILENAME}" 0 +2
      ClearErrors

      IfErrors 0 +3
      StrCpy $R3 "$INSTDIR$R0\$R2"
      Goto done

    continue:
      FindNext $R1 $R2
      Goto loop

  break:
    StrCpy $R3 0

  done:
    FindClose $R1

    StrCpy $R0 $R3

    Pop $R3
    Pop $R2
    Pop $R1
    Exch $R0
FunctionEnd

Function un.restoreFiles
  Exch $R0
  Push $R1
  Push $R2
  Push $R3

  StrCpy $R3 "$PLUGINSDIR\old-install$R0\*.*"
  FindFirst $R1 $R2 $R3

  loop:
    StrCmp $R2 "" break

    StrCmp $R2 "." continue
    StrCmp $R2 ".." continue

    IfFileExists "$INSTDIR$R0\$R2\*.*" isDir isNotDir

    isDir:
      CreateDirectory "$INSTDIR$R0\$R2"

      Push "$R0\$R2"
      Call un.restoreFiles
      Pop $R3

      Goto continue

    isNotDir:
      Rename "$PLUGINSDIR\old-install$R0\$R2" "$INSTDIR$R0\$R2"

    continue:
      FindNext $R1 $R2
      Goto loop

  break:
    StrCpy $R0 0
    FindClose $R1

    Pop $R3
    Pop $R2
    Pop $R1
    Exch $R0
FunctionEnd

!ifndef UNINSTALL_SECTION_NAME
  !define UNINSTALL_SECTION_NAME "Uninstall"
!endif

Section "un.${UNINSTALL_SECTION_NAME}"
  SectionIn RO
  # for assisted installer we check it here to show progress
  !ifndef ONE_CLICK
    ${IfNot} ${Silent}
      call un.checkAppRunning
    ${endIf}
  !endif

  !insertmacro setLinkVars

  !ifmacrodef customUnInstall
    !insertmacro customUnInstall
  !endif

  # delete the installed files
  !ifmacrodef customRemoveFiles
    !insertmacro customRemoveFiles
  !else
    ${if} ${isUpdated}
      CreateDirectory "$PLUGINSDIR\old-install"

      Push ""
      Call un.atomicRMDir
      Pop $R0

      ${if} $R0 != 0
        DetailPrint "File is busy, aborting: $R0"

        # Attempt to restore previous directory
        Push ""
        Call un.restoreFiles
        Pop $R0

        Abort `Can't rename "$INSTDIR" to "$PLUGINSDIR\old-install".`
      ${endif}

    ${endif}

    # Move out of $INSTDIR so it can be removed
    SetOutPath $TEMP
    # Remove all files (or remaining shallow directories from the block above)
    RMDir /r $INSTDIR
  !endif

  ${ifNot} ${isKeepShortcuts}
    WinShell::UninstAppUserModelId "${APP_ID}"

    !ifndef DO_NOT_CREATE_DESKTOP_SHORTCUT
      WinShell::UninstShortcut "$oldDesktopLink"
      Delete "$oldDesktopLink"
    !endif

    !ifndef DO_NOT_CREATE_START_MENU_SHORTCUT
      WinShell::UninstShortcut "$oldStartMenuLink"

      Delete "$oldStartMenuLink"
      ReadRegStr $R1 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" MenuDirectory
      ${ifNot} $R1 == ""
        RMDir "$SMPROGRAMS\$R1"
      ${endIf}
    !endif
  ${endIf}

  # refresh the desktop
  System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'

  !ifmacrodef unregisterFileAssociations
    !insertmacro unregisterFileAssociations
  !else
    ; v2.9.12 — con script de instalador personalizado, electron-builder no genera
    ; unregisterFileAssociations: limpiamos aquí las asociaciones registradas
    ; (misma lista que fileAssociations de package.json)
    !insertmacro APP_UNASSOCIATE "pdf" "PDFPro.Document.PDF"
    !insertmacro APP_UNASSOCIATE "docx" "PDFPro.Document.Word"
    !insertmacro APP_UNASSOCIATE "doc" "PDFPro.Document.Word"
    !insertmacro APP_UNASSOCIATE "xlsx" "PDFPro.Document.Excel"
    !insertmacro APP_UNASSOCIATE "xlsm" "PDFPro.Document.Excel"
    !insertmacro APP_UNASSOCIATE "xls" "PDFPro.Document.Excel"
    !insertmacro APP_UNASSOCIATE "csv" "PDFPro.Document.Excel"
    !insertmacro APP_UNASSOCIATE "jpg" "PDFPro.Image"
    !insertmacro APP_UNASSOCIATE "jpeg" "PDFPro.Image"
    !insertmacro APP_UNASSOCIATE "jfif" "PDFPro.Image"
    !insertmacro APP_UNASSOCIATE "png" "PDFPro.Image"
    !insertmacro APP_UNASSOCIATE "gif" "PDFPro.Image"
    !insertmacro APP_UNASSOCIATE "bmp" "PDFPro.Image"
    !insertmacro APP_UNASSOCIATE "webp" "PDFPro.Image"
    !insertmacro APP_UNASSOCIATE "avif" "PDFPro.Image"
    !insertmacro APP_UNASSOCIATE "ico" "PDFPro.Image"
    !insertmacro APP_UNASSOCIATE "svg" "PDFPro.Image"
  !endif

  Var /GLOBAL isDeleteAppData
  StrCpy $isDeleteAppData "0"

  ClearErrors
  ${GetParameters} $R0
  ${GetOptions} $R0 "--delete-app-data" $R1
  ${if} ${Errors}
    !ifdef DELETE_APP_DATA_ON_UNINSTALL
      ${ifNot} ${isUpdated}
        StrCpy $isDeleteAppData "1"
      ${endif}
    !endif
  ${else}
    StrCpy $isDeleteAppData "1"
  ${endIf}

  ${if} $isDeleteAppData == "1"
    # electron always uses per user app data
    ${if} $installMode == "all"
      SetShellVarContext current
    ${endif}
    RMDir /r "$APPDATA\${APP_FILENAME}"
    !ifdef APP_PRODUCT_FILENAME
      RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
    !endif
    # electron use package.json name for cache,indexdb etc.
    !ifdef APP_PACKAGE_NAME
      RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
    !endif
    ${if} $installMode == "all"
      SetShellVarContext all
    ${endif}
  ${endif}

  DeleteRegKey SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}"
  !ifdef UNINSTALL_REGISTRY_KEY_2
    DeleteRegKey SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY_2}"
  !endif
  DeleteRegKey SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}"

  !ifdef ONE_CLICK
    !insertmacro quitSuccess
  !endif
SectionEnd

!ifmacrodef customUnInstallSection
  !insertmacro customUnInstallSection
!endif
