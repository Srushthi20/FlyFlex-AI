@echo off
echo Checking required commands...
where java >nul 2>nul || echo MISSING: Java 21+
where node >nul 2>nul || echo MISSING: Node.js 20+
where npm >nul 2>nul || echo MISSING: npm
where python >nul 2>nul || echo MISSING: Python 3.11+
where mvn >nul 2>nul || echo MISSING: Maven (or install Maven Wrapper)
echo Check the messages above, then follow README.md.
pause
