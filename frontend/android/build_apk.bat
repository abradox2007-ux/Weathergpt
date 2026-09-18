@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Starting Android APK build...
echo JAVA_HOME is %JAVA_HOME%
echo ANDROID_HOME is %ANDROID_HOME%

call gradlew.bat assembleDebug
if %ERRORLEVEL% equ 0 (
    echo APK Build succeeded!
) else (
    echo APK Build failed with error %ERRORLEVEL%
)
