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

import { element, by, ElementFinder, Locator } from 'protractor';
import { BrowserVisibility } from '../../core/utils/browser-visibility';
import { BrowserActions } from '../../core/utils/browser-actions';

export class DateTimePickerCalendarPage {

    datePicker: ElementFinder = element(by.css(`.mat-datetimepicker-calendar`));
    today: ElementFinder = element(by.css(`.mat-datetimepicker-calendar-body-today`));
    timePicker: ElementFinder = element(by.css('.mat-datetimepicker-clock'));
    hourTime: ElementFinder = element.all(by.css('.mat-datetimepicker-clock-hours .mat-datetimepicker-clock-cell')).first();
    minutesTime: ElementFinder = element.all(by.css('.mat-datetimepicker-clock-minutes .mat-datetimepicker-clock-cell')).first();
    firstEnabledHourSelector: Locator = by.css('.mat-datetimepicker-clock-cell:not(.mat-datetimepicker-clock-cell-disabled)');
    firstEnabledMinutesSelector: Locator = by.css('.mat-datetimepicker-clock-cell:not(.mat-datetimepicker-clock-cell-disabled)');
    hoursPicker: ElementFinder = element(by.css('.mat-datetimepicker-clock-hours'));
    minutePicker: ElementFinder = element(by.css('.mat-datetimepicker-clock-minutes'));

    async waitTillDateDisplayed(): Promise<void> {
        await BrowserVisibility.waitUntilElementIsVisible(this.datePicker);
    }

    async setToday(): Promise<void> {
        await BrowserActions.click(this.today);
    }

    async setTime(): Promise<void> {
        await BrowserActions.click(this.hourTime);
        await BrowserActions.click(this.minutesTime);
    }

    async setDate(date?: string): Promise<boolean> {
        try {
            if (date) {
                await BrowserActions.click(element(by.cssContainingText(`.mat-datetimepicker-calendar-body-cell-content`, date)));
            } else {
                await this.setToday();
            }
            await this.setTime();
            return true;
        } catch {
            return false;
        }
    }

    async checkCalendarTodayDayIsDisabled(): Promise<void> {
        await BrowserVisibility.waitUntilElementIsPresent(element(by.cssContainingText('.mat-datetimepicker-calendar-body-disabled', await BrowserActions.getText(this.today))));
    }

    async setDefaultEnabledHour(): Promise<void> {
        await BrowserVisibility.waitUntilElementIsVisible(this.hoursPicker);
        await BrowserActions.click(this.hoursPicker.all(this.firstEnabledHourSelector).first());
    }

    async setDefaultEnabledMinutes() {
        await BrowserVisibility.waitUntilElementIsVisible(this.minutePicker);
        await BrowserActions.click(this.minutePicker.all(this.firstEnabledMinutesSelector).first());
    }
}
