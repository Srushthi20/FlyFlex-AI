@echo off
setlocal
rem Portable Maven launcher for Windows. Downloads Maven into the user's profile if needed.
set "MAVEN_VERSION=3.9.11"
set "MAVEN_HOME=%USERPROFILE%\.m2\portable-maven\apache-maven-%MAVEN_VERSION%"
set "MAVEN_ZIP=%USERPROFILE%\.m2\portable-maven\apache-maven-%MAVEN_VERSION%-bin.zip"
set "MAVEN_URL=https://archive.apache.org/dist/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip"

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
  echo Maven is not installed system-wide. Downloading portable Maven %MAVEN_VERSION%...
  if not exist "%USERPROFILE%\.m2\portable-maven" mkdir "%USERPROFILE%\.m2\portable-maven"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -Uri '%MAVEN_URL%' -OutFile '%MAVEN_ZIP%'; Expand-Archive -LiteralPath '%MAVEN_ZIP%' -DestinationPath '%USERPROFILE%\.m2\portable-maven' -Force"
  if errorlevel 1 (
    echo ERROR: Could not download or extract Maven. Check your internet connection and try again.
    exit /b 1
  )
)
if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
  echo ERROR: Maven files were not found at "%MAVEN_HOME%".
  exit /b 1
)
call "%MAVEN_HOME%\bin\mvn.cmd" %*
exit /b %ERRORLEVEL%
