This is a publish file. I'm trying to create a new publish version for my repo by this command "npm run bump-version -- 3.252.243" And this is the "bump-version.ts" file. And in package.json we have this line ""bump-version": "ts-node ./tools/bump-version.ts","
 
const { execSync } = require('child_process');

const fs = require('fs');

const path = require('path');
 
class VersionBumper {

    private version: string;

    private packagePaths: string[];

    private projectName: string;
 
    constructor(version: string) {

        this.version = version;

        this.projectName = 'j3-crew-ui-ng';

        this.packagePaths = [

            path.resolve(__dirname, '..', 'package.json'), // Root package.json

            path.resolve(__dirname, '..', 'projects', this.projectName, 'package.json'), // j3-crew-ui-ng package.json

        ];

    }
 
    // Run shell commands synchronously

    private runCommand(command: string) {

        try {

            console.log(`Running command: ${command}`);

            execSync(command, { stdio: 'inherit' });

        } catch (error) {

            console.error(`Error running command: ${command}`);

            process.exit(1);

        }

    }
 
    // Read and update the package.json version

    private updatePackageVersions() {

        this.packagePaths.forEach((packagePath) => {

            if (!fs.existsSync(packagePath)) {

                console.error(`package.json not found at ${packagePath}!`);

                process.exit(1);

            }
 
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

            packageJson.version = this.version;

            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf-8');

            console.log(`Updated ${packagePath} to version: ${this.version}`);

        });

    }
 
    private deleteDistFolder() {

        const distPath = path.resolve(__dirname, '..', 'dist');

        if (fs.existsSync(distPath)) {

            console.log(`Deleting existing dist folder at: ${distPath}`);

            fs.rmSync(distPath, { recursive: true, force: true });

            console.log('dist folder deleted.');

        }

    }
 
 
    public bumpVersion() {

        try {

            // Step 1: Stash changes

            this.runCommand('git stash');
 
            // Step 2: Checkout to dev and pull the latest updates

            this.runCommand('git checkout dev');

            this.runCommand('git pull');
 
            // Step 3: Create and checkout to a new version branch

            const versionBranch = `release/${this.version}`;

            this.runCommand(`git checkout -b ${versionBranch}`);
 
            // Step 4: Update the version in package.json

            this.updatePackageVersions();
 
            // Step 5: Delete the dist folder

            this.deleteDistFolder();
 
            // Step 6: Build the project using Angular CLI

            this.runCommand(`ng build ${this.projectName}`);
 
            // Step 7: Publish the npm package

            const distPath = path.resolve(__dirname, '..', 'dist', this.projectName);

            this.runCommand(`cd ${distPath} && npm publish`);
 
            // Step 8: Commit the changes and push to the new branch

            this.runCommand('git add .');

            this.runCommand(`git commit -m "Published version: ${this.version}"`);

            this.runCommand(`git push origin ${versionBranch}`);
 
            this.runCommand(`git stash apply`);
 
            console.log('Version bump process completed successfully!');

        } catch (error) {

            console.error('Error during version bumping:', error);

            this.runCommand(`git stash apply`);

            process.exit(1);

        }

    }

}
 
// Main Execution

const args = process.argv.slice(2);

const version = args[0];
 
if (!version) {

    console.error('Version argument is required. Usage: npm run bump-version -- <version>');

    process.exit(1);

}
 
const versionBumper = new VersionBumper(version);

versionBumper.bumpVersion();
 
 
This is the error that I'm facing
 
PS C:\Repos\j3-crew-ng> npm run bump-version -- 3.252.244

npm warn Unknown project config "always-auth". This will stop working in the next major version of npm.
 
> j3-crew-ng@3.253.132 bump-version
> ts-node ./tools/bump-version.ts 3.252.244
 
Running command: git stash

No local changes to save

Running command: git checkout dev

Already on 'dev'

Your branch is up to date with 'origin/dev'.

Running command: git pull

Building Angular Package

(node:28392) Warning: Accessing non-existent property 'lineno' of module exports inside circular dependency

(Use `node --trace-warnings ...` to show where the warning was created)

(node:28392) Warning: Accessing non-existent property 'column' of module exports inside circular dependency

(node:28392) Warning: Accessing non-existent property 'filename' of module exports inside circular dependency

(node:28392) Warning: Accessing non-existent property 'lineno' of module exports inside circular dependency

(node:28392) Warning: Accessing non-existent property 'column' of module exports inside circular dependency

(node:28392) Warning: Accessing non-existent property 'filename' of module exports inside circular dependency
 
------------------------------------------------------------------------------

Building entry point 'j3-crew-ui-ng'

------------------------------------------------------------------------------

Compiling TypeScript sources through ngc

WARNING: Unexpected '}' at 39:1.

WARNING: Unexpected '}' at 40:0.

WARNING: Invalid property name '> span {
&.arrow-close {

                right' at 29:1. Ignoring.

WARNING: Invalid selector '}

}
 
.tree-container' at 39:1. Ignoring.

WARNING: autoprefixer: C:\Repos\j3-crew-ng\projects\j3-crew-ui-ng\src\lib\components\risk-assessment\risk-assessment-linked-sections\risk-assessment-details-section\risk-assessment-details-section.component.css:90:3: end value has mixed support, consider using flex-end instead

WARNING: autoprefixer: C:\Repos\j3-crew-ng\projects\j3-crew-ui-ng\src\lib\components\risk-assessment\risk-assessment-linked-sections\risk-assessment-details-section\risk-assessment-details-section.component.css:106:3: end value has mixed support, consider using flex-end instead

WARNING: autoprefixer: C:\Repos\j3-crew-ng\projects\j3-crew-ui-ng\src\lib\components\risk-assessment\risk-assessment-linked-sections\risk-assessment-job-information-section\risk-assessment-job-information-section.component.css:37:3: end value has mixed support, consider using flex-end instead

WARNING: autoprefixer: C:\Repos\j3-crew-ng\projects\j3-crew-ui-ng\src\lib\components\risk-assessment\risk-assessment-linked-sections\risk-assessment-job-information-section\risk-assessment-job-information-section.component.css:53:3: end value has mixed support, consider using flex-end instead

ERROR: projects/j3-crew-ui-ng/src/lib/components/risk-assessment/risk-assessment-linked-details/risk-assessment-details.component.html(135,31): Property 'cellStyle' does not exist on type 'string | IThreshold'.

  Property 'cellStyle' does not exist on type 'string'.

projects/j3-crew-ui-ng/src/lib/components/risk-assessment/risk-assessment-linked-details/risk-assessment-details.component.html(136,12): Property 'icon' does not exist on type 'string | IThreshold'.

  Property 'icon' does not exist on type 'string'.

projects/j3-crew-ui-ng/src/lib/components/risk-assessment/risk-assessment-linked-details/risk-assessment-details.component.html(136,67): Property 'cellStyle' does not exist on type 'string | IThreshold'.

  Property 'cellStyle' does not exist on type 'string'.

projects/j3-crew-ui-ng/src/lib/components/risk-assessment/risk-assessment-linked-details/risk-assessment-details.component.html(136,163): Property 'value' does not exist on type 'string | IThreshold'.

  Property 'value' does not exist on type 'string'.
 
An unhandled exception occurred: projects/j3-crew-ui-ng/src/lib/components/risk-assessment/risk-assessment-linked-details/risk-assessment-details.component.html(135,31): Property 'cellStyle' does not exist on type 'string | IThreshold'.

  Property 'cellStyle' does not exist on type 'string'.

projects/j3-crew-ui-ng/src/lib/components/risk-assessment/risk-assessment-linked-details/risk-assessment-details.component.html(136,12): Property 'icon' does not exist on type 'string | IThreshold'.

  Property 'icon' does not exist on type 'string'.

projects/j3-crew-ui-ng/src/lib/components/risk-assessment/risk-assessment-linked-details/risk-assessment-details.component.html(136,67): Property 'cellStyle' does not exist on type 'string | IThreshold'.

  Property 'cellStyle' does not exist on type 'string'.

projects/j3-crew-ui-ng/src/lib/components/risk-assessment/risk-assessment-linked-details/risk-assessment-details.component.html(136,163): Property 'value' does not exist on type 'string | IThreshold'.

  Property 'value' does not exist on type 'string'.
 
See "C:\Users\ABDULH~1\AppData\Local\Temp\ng-e5QgQK\angular-errors.log" for further details.

 
