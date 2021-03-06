/*!
 * @license
 * Copyright 2019 Alfresco Software, Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { LoginPage, AboutPage } from '@alfresco/adf-testing';
import { AlfrescoApiCompatibility as AlfrescoApi } from '@alfresco/js-api';
import { browser } from 'protractor';
import { NavigationBarPage } from '../pages/adf/navigation-bar.page';
import { AcsUserModel } from '../models/ACS/acs-user.model';

describe('About Content Services', () => {

    const loginPage = new LoginPage();
    const navigationBarPage = new NavigationBarPage();
    const aboutPage = new AboutPage();
    const acsUser = new AcsUserModel();

    beforeAll(async() => {
        this.alfrescoJsApi = new AlfrescoApi({
            provider: 'ECM',
            hostEcm: browser.params.testConfig.adf_acs.host
        });

        await this.alfrescoJsApi.login(browser.params.testConfig.adf.adminEmail, browser.params.testConfig.adf.adminPassword);
        await this.alfrescoJsApi.core.peopleApi.addPerson(acsUser);
        await this.alfrescoJsApi.login(acsUser.id, acsUser.password);
        await loginPage.loginToContentServicesUsingUserModel(acsUser);
        await navigationBarPage.clickAboutButton();
    });

    afterAll(async () => {
        await navigationBarPage.clickLogoutButton();
    });

    it('[C280002] Should be able to view about content services info', async () => {
        await aboutPage.checkAppTitleIsDisplayed();
        await aboutPage.checkSourceCodeTitleIsDisplayed();
        await aboutPage.checkGithubUrlIsDisplayed();
        await aboutPage.checkGithubVersionIsDisplayed();
        await aboutPage.checkEcmHostIsDisplayed();
        await aboutPage.checkEcmEditionIsDisplayed();
        await aboutPage.checkEcmVersionIsDisplayed();
        await aboutPage.checkAboutListIsLoaded();
        await aboutPage.checkPackageColumnsIsDisplayed();
        await aboutPage.checkEcmStatusTitleIsDisplayed();
        await aboutPage.checkStatusColumnsIsDisplayed();
        await aboutPage.checkEcmLicenseTitleIsDisplayed();
        await aboutPage.checkLicenseColumnsIsDisplayed();
        await aboutPage.checkEcmModulesTitleIsDisplayed();
        await aboutPage.checkModulesColumnsIsDisplayed();
    });
});
