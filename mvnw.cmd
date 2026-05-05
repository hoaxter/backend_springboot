@REM Maven Wrapper startup batch script
@REM Adapted from https://github.com/apache/maven-wrapper
@echo off
setlocal

set MAVEN_PROJECTBASEDIR=%~dp0
set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_PROPERTIES="%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties"

@REM Download maven-wrapper.jar if not present
if not exist %WRAPPER_JAR% (
    echo Downloading Maven Wrapper...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar' -OutFile '%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar'}"
)

@REM Execute Maven via wrapper
java -jar %WRAPPER_JAR% %*
