/*!
 * @license
 * Copyright 2016 Alfresco Software, Ltd.
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

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, fakeAsync, tick, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MinimalNodeEntryEntity, SiteEntry, SitePaging } from 'alfresco-js-api';
import { SearchService, SitesService } from '@alfresco/adf-core';
import { DataTableModule } from '@alfresco/adf-core';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import {
    CustomResourcesService,
    EmptyFolderContentDirective,
    DocumentListComponent,
    DocumentListService
} from '../document-list';
import { DropdownSitesComponent } from '../site-dropdown';
import { DropdownBreadcrumbComponent } from '../breadcrumb';
import { ContentNodeSelectorPanelComponent } from './content-node-selector-panel.component';
import { ContentNodeSelectorService } from './content-node-selector.service';
import { NodePaging } from 'alfresco-js-api';

const ONE_FOLDER_RESULT = {
    list: {
        entries: [
            {
                entry: {
                    id: '123', name: 'MyFolder', isFile: false, isFolder: true,
                    createdByUser: { displayName: 'John Doe' },
                    modifiedByUser: { displayName: 'John Doe' }
                }
            }
        ],
        pagination: {
            hasMoreItems: true
        }
    }
};

describe('ContentNodeSelectorComponent', () => {
    const debounceSearch = 200;
    let component: ContentNodeSelectorPanelComponent;
    let fixture: ComponentFixture<ContentNodeSelectorPanelComponent>;
    let contentNodeSelectorService: ContentNodeSelectorService;
    let searchService: SearchService;
    let searchSpy: jasmine.Spy;
    let cnSearchSpy: jasmine.Spy;

    let _observer: Observer<NodePaging>;

    function typeToSearchBox(searchTerm = 'string-to-search') {
        let searchInput = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-search-input"]'));
        searchInput.nativeElement.value = searchTerm;
        component.searchInput.setValue(searchTerm);
        fixture.detectChanges();
    }

    function respondWithSearchResults(result) {
        _observer.next(result);
    }

    afterEach(() => {
        fixture.destroy();
        TestBed.resetTestingModule();
    });

    describe('General component features', () => {

        beforeEach(async(() => {
            TestBed.configureTestingModule({
                imports: [
                    DataTableModule
                ],
                declarations: [
                    DocumentListComponent,
                    EmptyFolderContentDirective,
                    DropdownSitesComponent,
                    DropdownBreadcrumbComponent,
                    ContentNodeSelectorPanelComponent
                ],
                providers: [
                    CustomResourcesService,
                    SearchService,
                    DocumentListService,
                    SitesService,
                    ContentNodeSelectorService
                ],
                schemas: [CUSTOM_ELEMENTS_SCHEMA]
            });
            TestBed.compileComponents();
        }));

        beforeEach(() => {
            fixture = TestBed.createComponent(ContentNodeSelectorPanelComponent);
            component = fixture.componentInstance;
            component.debounceSearch = 0;

            searchService = TestBed.get(SearchService);
            contentNodeSelectorService = TestBed.get(ContentNodeSelectorService);
            cnSearchSpy = spyOn(contentNodeSelectorService, 'search').and.callThrough();
            searchSpy = spyOn(searchService, 'searchByQueryBody').and.callFake(() => {
                return Observable.create((observer: Observer<NodePaging>) => {
                    _observer = observer;
                });
            });
        });

        describe('Parameters', () => {

            it('should trigger the select event when selection has been made', (done) => {
                const expectedNode = <MinimalNodeEntryEntity> {};
                component.select.subscribe((nodes) => {
                    expect(nodes.length).toBe(1);
                    expect(nodes[0]).toBe(expectedNode);
                    done();
                });

                component.chosenNode = expectedNode;
            });

            it('should update skipCount on folder loaded', () => {
                component.skipCount = 8;

                component.onFolderLoaded({
                    list: {
                        pagination: {
                            skipCount: 10
                        }
                    }
                });

                expect(component.skipCount).toBe(10, 'skipCount is updated');
            });
        });

        xdescribe('Breadcrumbs', () => {

            let documentListService,
                sitesService,
                expectedDefaultFolderNode;

            beforeEach(() => {
                expectedDefaultFolderNode = <MinimalNodeEntryEntity> { path: { elements: [] } };
                documentListService = TestBed.get(DocumentListService);
                sitesService = TestBed.get(SitesService);
                spyOn(documentListService, 'getFolderNode').and.returnValue(Observable.of(expectedDefaultFolderNode));
                spyOn(documentListService, 'getFolder').and.returnValue(Observable.throw('No results for test'));
                spyOn(sitesService, 'getSites').and.returnValue(Observable.of({ list: { entries: [] } }));
                spyOn(component.documentList, 'loadFolderNodesByFolderNodeId').and.returnValue(Promise.resolve());
                component.currentFolderId = 'cat-girl-nuku-nuku';
                fixture.detectChanges();
            });

            it('should show the breadcrumb for the currentFolderId by default', (done) => {
                fixture.detectChanges();

                fixture.whenStable().then(() => {
                    fixture.detectChanges();
                    const breadcrumb = fixture.debugElement.query(By.directive(DropdownBreadcrumbComponent));
                    expect(breadcrumb).not.toBeNull();
                    expect(breadcrumb.componentInstance.folderNode).toBe(expectedDefaultFolderNode);
                    done();
                });
            });

            it('should not show the breadcrumb if search was performed as last action', fakeAsync(() => {
                typeToSearchBox();
                tick(debounceSearch);

                fixture.detectChanges();

                respondWithSearchResults(ONE_FOLDER_RESULT);

                tick(debounceSearch);

                fixture.detectChanges();

                tick(debounceSearch);

                const breadcrumb = fixture.debugElement.query(By.directive(DropdownBreadcrumbComponent));
                expect(breadcrumb).toBeNull();
            }));

            it('should show the breadcrumb again on folder navigation in the results list', fakeAsync(() => {
                typeToSearchBox();
                tick(debounceSearch);

                fixture.detectChanges();

                respondWithSearchResults(ONE_FOLDER_RESULT);
                tick(debounceSearch);

                fixture.detectChanges();

                tick(debounceSearch);

                component.onFolderChange();
                fixture.detectChanges();
                const breadcrumb = fixture.debugElement.query(By.directive(DropdownBreadcrumbComponent));
                expect(breadcrumb).not.toBeNull();

            }));

            it('should show the breadcrumb for the selected node when search results are displayed', fakeAsync(() => {
                typeToSearchBox();

                tick(debounceSearch);

                fixture.detectChanges();

                respondWithSearchResults(ONE_FOLDER_RESULT);
                fixture.detectChanges();

                tick(debounceSearch);

                const chosenNode = <MinimalNodeEntryEntity> { path: { elements: ['one'] } };
                component.onNodeSelect({ detail: { node: { entry: chosenNode } } });
                fixture.detectChanges();

                tick(debounceSearch);

                const breadcrumb = fixture.debugElement.query(By.directive(DropdownBreadcrumbComponent));
                expect(breadcrumb).not.toBeNull();
                expect(breadcrumb.componentInstance.folderNode.path).toBe(chosenNode.path);
            }));

            it('should NOT show the breadcrumb for the selected node when not on search results list', (done) => {
                typeToSearchBox();

                setTimeout(() => {
                    respondWithSearchResults(ONE_FOLDER_RESULT);

                    fixture.detectChanges();
                    component.onFolderChange();
                    fixture.detectChanges();

                    const chosenNode = <MinimalNodeEntryEntity> { path: { elements: [] } };
                    component.onNodeSelect({ detail: { node: { entry: chosenNode } } });
                    fixture.detectChanges();

                    const breadcrumb = fixture.debugElement.query(By.directive(DropdownBreadcrumbComponent));
                    expect(breadcrumb).not.toBeNull();
                    expect(breadcrumb.componentInstance.folderNode).toBe(expectedDefaultFolderNode);
                    done();
                }, 300);
            });

            it('should keep breadcrumb\'s folderNode unchanged if breadcrumbTransform is NOT defined', (done) => {
                fixture.detectChanges();

                fixture.whenStable().then(() => {
                    fixture.detectChanges();
                    expect(component.breadcrumbTransform).toBeNull();

                    const breadcrumb = fixture.debugElement.query(By.directive(DropdownBreadcrumbComponent));
                    expect(breadcrumb.componentInstance.folderNode).toBe(expectedDefaultFolderNode);
                    done();
                });
            });

            it('should make changes to breadcrumb\'s folderNode if breadcrumbTransform is defined', (done) => {
                const transformedFolderNode = <MinimalNodeEntryEntity> {
                    id: 'trans-node',
                    name: 'trans-node-name',
                    path: { elements: [{ id: 'testId', name: 'testName' }] }
                };
                component.breadcrumbTransform = (() => {
                    return transformedFolderNode;
                });
                fixture.detectChanges();

                fixture.whenStable().then(() => {
                    fixture.detectChanges();
                    expect(component.breadcrumbTransform).not.toBeNull();

                    const breadcrumb = fixture.debugElement.query(By.directive(DropdownBreadcrumbComponent));
                    expect(breadcrumb.componentInstance.route[0].name).toBe('testName');
                    expect(breadcrumb.componentInstance.route[0].id).toBe('testId');
                    done();
                });
            });
        });

        describe('Search functionality', () => {
            let getCorrespondingNodeIdsSpy;

            let defaultSearchOptions = (searchTerm, rootNodeId = undefined, skipCount = 0) => {

                const parentFiltering = rootNodeId ? [{ query: `ANCESTOR:'workspace://SpacesStore/${rootNodeId}'` }] : [];

                let defaultSearchNode: any = {
                    query: {
                        query: searchTerm ? `${searchTerm}* OR name:${searchTerm}*` : searchTerm
                    },
                    include: ['path', 'allowableOperations'],
                    paging: {
                        maxItems: 25,
                        skipCount: skipCount
                    },
                    filterQueries: [
                        { query: "TYPE:'cm:folder'" },
                        { query: 'NOT cm:creator:System' },
                        ...parentFiltering
                    ],
                    scope: {
                        locations: ['nodes']
                    }
                };

                return defaultSearchNode;
            };

            beforeEach(() => {
                const documentListService = TestBed.get(DocumentListService);
                const expectedDefaultFolderNode = <MinimalNodeEntryEntity> { path: { elements: [] } };

                spyOn(documentListService, 'getFolderNode').and.returnValue(Observable.of(expectedDefaultFolderNode));
                spyOn(component.documentList, 'loadFolderNodesByFolderNodeId').and.returnValue(Promise.resolve());

                const sitesService = TestBed.get(SitesService);
                spyOn(sitesService, 'getSites').and.returnValue(Observable.of({ list: { entries: [] } }));

                getCorrespondingNodeIdsSpy = spyOn(component.documentList, 'getCorrespondingNodeIds').and
                    .callFake(id => {
                        if (id === '-sites-') {
                            return Observable.of(['123456testId', '09876543testId']);
                        }
                        return Observable.of([id]);
                    });

                component.currentFolderId = 'cat-girl-nuku-nuku';
                fixture.detectChanges();
            });

            it('should load the results by calling the search api on search change', fakeAsync(() => {
                typeToSearchBox('kakarot');

                tick(debounceSearch);
                fixture.detectChanges();

                expect(searchSpy).toHaveBeenCalledWith(defaultSearchOptions('kakarot'));
            }));

            it('should reset the currently chosen node in case of starting a new search', fakeAsync(() => {
                component.chosenNode = <MinimalNodeEntryEntity> {};
                typeToSearchBox('kakarot');

                tick(debounceSearch);
                fixture.detectChanges();

                expect(component.chosenNode).toBeNull();
            }));

            it('should call the search api on changing the site selectbox\'s value', fakeAsync(() => {
                typeToSearchBox('vegeta');

                tick(debounceSearch);

                expect(searchSpy.calls.count()).toBe(1, 'Search count should be one after only one search');

                component.siteChanged(<SiteEntry> { entry: { guid: 'namek' } });

                expect(searchSpy.calls.count()).toBe(2, 'Search count should be two after the site change');
                expect(searchSpy.calls.argsFor(1)).toEqual([defaultSearchOptions('vegeta', 'namek')]);
            }));

            it('should call the content node selector\'s search with the right parameters on changing the site selectbox\'s value', fakeAsync(() => {
                typeToSearchBox('vegeta');

                tick(debounceSearch);
                expect(cnSearchSpy.calls.count()).toBe(1);

                component.siteChanged(<SiteEntry> { entry: { guid: '-sites-' } });

                expect(cnSearchSpy).toHaveBeenCalled();
                expect(cnSearchSpy.calls.count()).toBe(2);
                expect(cnSearchSpy).toHaveBeenCalledWith('vegeta', '-sites-', 0, 25);
            }));

            it('should call the content node selector\'s search with the right parameters on changing the site selectbox\'s value from a custom dropdown menu', fakeAsync(() => {
                component.dropdownSiteList = <SitePaging> { list: { entries: [<SiteEntry> { entry: { guid: '-sites-' } }, <SiteEntry> { entry: { guid: 'namek' } }] } };
                fixture.detectChanges();

                typeToSearchBox('vegeta');

                tick(debounceSearch);

                expect(cnSearchSpy.calls.count()).toBe(1);

                component.siteChanged(<SiteEntry> { entry: { guid: '-sites-' } });

                expect(cnSearchSpy).toHaveBeenCalled();
                expect(cnSearchSpy.calls.count()).toBe(2);
                expect(cnSearchSpy).toHaveBeenCalledWith('vegeta', '-sites-', 0, 25, ['123456testId', '09876543testId']);
            }));

            it('should get the corresponding node ids before the search call on changing the site selectbox\'s value from a custom dropdown menu', fakeAsync(() => {
                component.dropdownSiteList = <SitePaging> { list: { entries: [<SiteEntry> { entry: { guid: '-sites-' } }, <SiteEntry> { entry: { guid: 'namek' } }] } };
                fixture.detectChanges();

                typeToSearchBox('vegeta');

                tick(debounceSearch);

                expect(getCorrespondingNodeIdsSpy.calls.count()).toBe(1, 'getCorrespondingNodeIdsSpy calls count should be one after only one search');

                component.siteChanged(<SiteEntry> { entry: { guid: 'namek' } });

                expect(getCorrespondingNodeIdsSpy.calls.count()).toBe(2, 'getCorrespondingNodeIdsSpy calls count should be two after the site change');
                expect(getCorrespondingNodeIdsSpy.calls.allArgs()).toEqual([[undefined], ['namek']]);
            }));

            it('should NOT get the corresponding node ids before the search call on changing the site selectbox\'s value from default dropdown menu', fakeAsync(() => {
                typeToSearchBox('vegeta');
                tick(debounceSearch);

                expect(getCorrespondingNodeIdsSpy.calls.count()).toBe(0, 'getCorrespondingNodeIdsSpy should not be called');

                component.siteChanged(<SiteEntry> { entry: { guid: 'namek' } });

                expect(getCorrespondingNodeIdsSpy).not.toHaveBeenCalled();
            }));

            it('should show the search icon by default without the X (clear) icon', fakeAsync(() => {
                fixture.detectChanges();
                tick(debounceSearch);

                let searchIcon = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-search-icon"]'));
                let clearIcon = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-search-clear"]'));

                expect(searchIcon).not.toBeNull('Search icon should be in the DOM');
                expect(clearIcon).toBeNull('Clear icon should NOT be in the DOM');
            }));

            it('should show the X (clear) icon without the search icon when the search contains at least one character', fakeAsync(() => {
                fixture.detectChanges();
                typeToSearchBox('123');
                tick(debounceSearch);

                fixture.detectChanges();

                let searchIcon = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-search-icon"]'));
                let clearIcon = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-search-clear"]'));

                expect(searchIcon).toBeNull('Search icon should NOT be in the DOM');
                expect(clearIcon).not.toBeNull('Clear icon should be in the DOM');
            }));

            it('should clear the search field, nodes and chosenNode when clicking on the X (clear) icon', () => {
                component.chosenNode = <MinimalNodeEntryEntity> {};
                component.nodes = {
                    list: {
                        entries: [{ entry: component.chosenNode }]
                    }
                };
                component.searchTerm = 'piccolo';
                component.showingSearchResults = true;

                component.clear();

                expect(component.searchTerm).toBe('');
                expect(component.nodes).toEqual(null);
                expect(component.chosenNode).toBeNull();
                expect(component.showingSearchResults).toBeFalsy();
            });

            it('should clear the search field, nodes and chosenNode when deleting the search input', fakeAsync(() => {
                spyOn(component, 'clear').and.callThrough();
                typeToSearchBox('a');

                tick(debounceSearch);
                fixture.detectChanges();

                expect(searchSpy.calls.count()).toBe(1);

                typeToSearchBox('');

                tick(debounceSearch);
                fixture.detectChanges();

                expect(searchSpy.calls.count()).toBe(1, 'no other search has been performed');
                expect(component.clear).toHaveBeenCalled();
                expect(component.folderIdToShow).toBe('cat-girl-nuku-nuku', 'back to the folder in which the search was performed');
            }));

            xit('should clear the search field, nodes and chosenNode on folder navigation in the results list', fakeAsync(() => {
                spyOn(component, 'clearSearch').and.callThrough();
                typeToSearchBox('a');

                tick(debounceSearch);
                fixture.detectChanges();

                respondWithSearchResults(ONE_FOLDER_RESULT);

                tick();
                fixture.detectChanges();

                component.onFolderChange();
                fixture.detectChanges();

                expect(component.clearSearch).toHaveBeenCalled();

            }));

            it('should show nodes from the same folder as selected in the dropdown on clearing the search input', fakeAsync(() => {
                typeToSearchBox('piccolo');
                tick(debounceSearch);

                expect(searchSpy.calls.count()).toBe(1);

                component.siteChanged(<SiteEntry> { entry: { guid: 'namek' } });

                expect(searchSpy.calls.count()).toBe(2);
                expect(searchSpy.calls.argsFor(1)).toEqual([defaultSearchOptions('piccolo', 'namek')]);

                component.clear();

                expect(component.searchTerm).toBe('');
                expect(component.folderIdToShow).toBe('namek');
            });

            it('should show the current folder\'s content instead of search results if search was not performed', () => {
                let documentList = fixture.debugElement.query(By.directive(DocumentListComponent));
                expect(documentList).not.toBeNull('Document list should be shown');
                expect(documentList.componentInstance.currentFolderId).toBe('cat-girl-nuku-nuku');
            });

            it('should pass through the rowFilter to the documentList', () => {
                const filter = () => {
                };
                component.rowFilter = filter;

                fixture.detectChanges();

                let documentList = fixture.debugElement.query(By.directive(DocumentListComponent));
                expect(documentList).not.toBeNull('Document list should be shown');
                expect(documentList.componentInstance.rowFilter).toBe(filter);
            });

            it('should pass through the imageResolver to the documentList', () => {
                const resolver = () => 'piccolo';
                component.imageResolver = resolver;

                fixture.detectChanges();

                let documentList = fixture.debugElement.query(By.directive(DocumentListComponent));
                expect(documentList).not.toBeNull('Document list should be shown');
                expect(documentList.componentInstance.imageResolver).toBe(resolver);
            });

            xit('should show the result list when search was performed', (done) => {
                typeToSearchBox();

                setTimeout(() => {
                    respondWithSearchResults(ONE_FOLDER_RESULT);

                    fixture.detectChanges();
                    let documentList = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-document-list"]'));
                    expect(documentList).not.toBeNull('Document list should be shown');
                    expect(documentList.componentInstance.currentFolderId).toBeNull();
                    done();
                }, 300);
            });

            xit('should highlight the results when search was performed in the next timeframe', fakeAsync(() => {
                spyOn(component.highlighter, 'highlight');
                typeToSearchBox('shenron');

                tick(debounceSearch);

                respondWithSearchResults(ONE_FOLDER_RESULT);
                fixture.detectChanges();

                tick(debounceSearch);

                expect(component.highlighter.highlight).not.toHaveBeenCalled();

                expect(component.highlighter.highlight).toHaveBeenCalledWith('shenron');
            }));

            xit('should show the default text instead of result list if search was cleared', (done) => {
                typeToSearchBox();

                setTimeout(() => {
                    respondWithSearchResults(ONE_FOLDER_RESULT);
                    fixture.detectChanges();

                    fixture.whenStable().then(() => {
                        let clearButton = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-search-clear"]'));
                        expect(clearButton).not.toBeNull('Clear button should be in DOM');
                        clearButton.triggerEventHandler('click', {});
                        fixture.detectChanges();

                        let documentList = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-document-list"]'));
                        expect(documentList).not.toBeNull('Document list should be shown');
                        expect(documentList.componentInstance.currentFolderId).toBe('cat-girl-nuku-nuku');
                        done();
                    });
                }, 300);
            });

            xit('should reload the original documentlist when clearing the search input', fakeAsync(() => {
                typeToSearchBox('shenron');

                tick(debounceSearch);

                respondWithSearchResults(ONE_FOLDER_RESULT);

                typeToSearchBox('');

                tick(debounceSearch);

                fixture.detectChanges();

                let documentList = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-document-list"]'));
                expect(documentList.componentInstance.currentFolderId).toBe('cat-girl-nuku-nuku');
            }));

            xit('should set the folderIdToShow to the default "currentFolderId" if siteId is undefined', (done) => {
                component.siteChanged(<SiteEntry> { entry: { guid: 'Kame-Sennin Muten Roshi' } });
                fixture.detectChanges();

                let documentList = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-document-list"]'));
                expect(documentList.componentInstance.currentFolderId).toBe('Kame-Sennin Muten Roshi');

                component.siteChanged(<SiteEntry> { entry: { guid: undefined } });
                fixture.detectChanges();

                documentList = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-document-list"]'));
                expect(documentList.componentInstance.currentFolderId).toBe('cat-girl-nuku-nuku');

                done();
            });

            describe('Pagination "Load more" button', () => {

                it('should NOT be shown by default', () => {
                    fixture.detectChanges();
                    const pagination = fixture.debugElement.query(By.css('[data-automation-id="adf-infinite-pagination-button"]'));
                    expect(pagination).toBeNull();
                });

                xit('should be shown when diplaying search results', fakeAsync(() => {
                    typeToSearchBox('shenron');

                    tick(debounceSearch);

                    respondWithSearchResults(ONE_FOLDER_RESULT);

                    fixture.detectChanges();
                    const pagination = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-search-pagination"]'));
                    expect(pagination).not.toBeNull();
                }));

                xit('button callback should load the next batch of results by calling the search api', async(() => {
                    const skipCount = 8;
                    component.searchTerm = 'kakarot';

                    component.getNextPageOfSearch({ skipCount });

                    fixture.whenStable().then(() => {
                        expect(searchSpy).toHaveBeenCalledWith('kakarot', undefined, skipCount, 25);
                    });
                }));

                it('should be shown when pagination\'s hasMoreItems is true', () => {
                    component.pagination = {
                        hasMoreItems: true
                    };
                    fixture.detectChanges();

                    const pagination = fixture.debugElement.query(By.css('[data-automation-id="content-node-selector-search-pagination"]'));
                    expect(pagination).not.toBeNull();
                });

                it('button callback should load the next batch of folder results when there is no searchTerm', () => {
                    const skipCount = 5;

                    component.searchTerm = '';
                    component.pagination = {
                        hasMoreItems: true
                    };
                    fixture.detectChanges();

                    component.getNextPageOfSearch({ skipCount });
                    fixture.detectChanges();
                    expect(component.searchTerm).toBe('');

                    expect(component.infiniteScroll).toBeTruthy();
                    expect(component.skipCount).toBe(skipCount);
                    expect(searchSpy).not.toHaveBeenCalled();
                });

                it('should set its loading state to true after search was started', fakeAsync(() => {
                    component.showingSearchResults = true;
                    component.pagination = { hasMoreItems: true };

                    typeToSearchBox('shenron');

                    tick(debounceSearch);

                    fixture.detectChanges();

                    const spinnerSelector = By.css('[data-automation-id="content-node-selector-search-pagination"] [data-automation-id="adf-infinite-pagination-spinner"]');
                    const paginationLoading = fixture.debugElement.query(spinnerSelector);
                    expect(paginationLoading).not.toBeNull();
                }));

                xit('should set its loading state to true after search was performed', fakeAsync(() => {
                    component.showingSearchResults = true;
                    component.pagination = { hasMoreItems: true };

                    typeToSearchBox('shenron');

                    tick(debounceSearch);

                    fixture.detectChanges();

                    respondWithSearchResults(ONE_FOLDER_RESULT);

                    fixture.detectChanges();
                    const spinnerSelector = By.css('[data-automation-id="content-node-selector-search-pagination"] [data-automation-id="adf-infinite-pagination-spinner"]');
                    const paginationLoading = fixture.debugElement.query(spinnerSelector);
                    expect(paginationLoading).toBeNull();
                }));
            });
        });

        describe('Chosen node', () => {

            const entry: MinimalNodeEntryEntity = <MinimalNodeEntryEntity> {};
            const nodePage: NodePaging = <NodePaging> { list: {}, pagination: {} };
            let hasPermission;

            function returnHasPermission(): boolean {
                return hasPermission;
            }

            beforeEach(() => {
                const sitesService = TestBed.get(SitesService);
                spyOn(sitesService, 'getSites').and.returnValue(Observable.of({ list: { entries: [] } }));
            });

            describe('in the case when isSelectionValid is a custom function for checking permissions,', () => {

                beforeEach(() => {
                    component.isSelectionValid = returnHasPermission;
                });

                it('should NOT be null after selecting node with the necessary permissions', async(() => {
                    hasPermission = true;
                    component.documentList.folderNode = entry;

                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).not.toBeNull();
                        expect(component.chosenNode).toBe(entry);
                    });

                    component.documentList.ready.emit(nodePage);
                    fixture.detectChanges();
                }));

                it('should be null after selecting node without the necessary permissions', async(() => {
                    hasPermission = false;
                    component.documentList.folderNode = entry;

                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).toBeNull();
                        expect(component.chosenNode).toBeNull();
                    });

                    component.documentList.ready.emit(nodePage);
                    fixture.detectChanges();
                }));

                it('should NOT be null after clicking on a node (with the right permissions) in the list (onNodeSelect)', async(() => {
                    hasPermission = true;

                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).not.toBeNull();
                        expect(component.chosenNode).toBe(entry);
                    });

                    component.onNodeSelect({ detail: { node: { entry } } });
                    fixture.detectChanges();
                }));

                it('should remain null when clicking on a node (with the WRONG permissions) in the list (onNodeSelect)', async(() => {
                    hasPermission = false;

                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).toBeNull();
                        expect(component.chosenNode).toBeNull();
                    });

                    component.onNodeSelect({ detail: { node: { entry } } });
                    fixture.detectChanges();
                }));

                it('should become null when clicking on a node (with the WRONG permissions) after previously selecting a right node', async(() => {
                    component.select.subscribe((nodes) => {

                        if (hasPermission) {
                            expect(nodes).toBeDefined();
                            expect(nodes).not.toBeNull();
                            expect(component.chosenNode).not.toBeNull();

                        } else {
                            expect(nodes).toBeDefined();
                            expect(nodes).toBeNull();
                            expect(component.chosenNode).toBeNull();
                        }
                    });

                    hasPermission = true;
                    component.onNodeSelect({ detail: { node: { entry } } });
                    fixture.detectChanges();

                    hasPermission = false;
                    component.onNodeSelect({ detail: { node: { entry } } });
                    fixture.detectChanges();
                }));

                it('should be null when the chosenNode is reset', async(() => {
                    hasPermission = true;
                    component.onNodeSelect({ detail: { node: { entry: <MinimalNodeEntryEntity> {} } } });
                    fixture.detectChanges();

                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).toBeNull();
                        expect(component.chosenNode).toBeNull();
                    });

                    component.resetChosenNode();
                    fixture.detectChanges();
                }));
            });

            describe('in the case when isSelectionValid is null', () => {

                beforeEach(() => {
                    component.isSelectionValid = null;
                });

                it('should NOT be null after selecting node because isSelectionValid would be reset to defaultValidation function', async(() => {
                    component.documentList.folderNode = entry;
                    fixture.detectChanges();

                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).not.toBeNull();
                        expect(component.chosenNode).not.toBeNull();
                        expect(component.isSelectionValid).not.toBeNull();
                    });

                    component.documentList.ready.emit(nodePage);
                    fixture.detectChanges();
                }));

                it('should NOT be null after clicking on a node in the list (onNodeSelect)', async(() => {
                    fixture.detectChanges();
                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).not.toBeNull();
                        expect(component.chosenNode).not.toBeNull();
                        expect(component.isSelectionValid).not.toBeNull();
                    });

                    component.onNodeSelect({ detail: { node: { entry } } });
                    fixture.detectChanges();
                }));

                it('should be null when the chosenNode is reset', async(() => {
                    fixture.detectChanges();
                    component.onNodeSelect({ detail: { node: { entry: <MinimalNodeEntryEntity> {} } } });
                    fixture.detectChanges();

                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).toBeNull();
                        expect(component.chosenNode).toBeNull();
                        expect(component.isSelectionValid).not.toBeNull();
                    });

                    component.resetChosenNode();
                    fixture.detectChanges();
                }));
            });

            describe('in the case when isSelectionValid is not defined', () => {

                beforeEach(() => {
                    component.isSelectionValid = undefined;
                });

                it('should NOT be null after selecting node because isSelectionValid would be the defaultValidation function', async(() => {
                    component.documentList.folderNode = entry;
                    fixture.detectChanges();

                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).not.toBeNull();
                        expect(component.chosenNode).not.toBeNull();
                        expect(component.isSelectionValid).not.toBeNull();
                    });

                    component.documentList.ready.emit(nodePage);
                    fixture.detectChanges();
                }));

                it('should NOT be null after clicking on a node in the list (onNodeSelect)', async(() => {
                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).not.toBeNull();
                        expect(component.chosenNode).not.toBeNull();
                        expect(component.isSelectionValid).not.toBeNull();
                    });
                    fixture.detectChanges();

                    component.onNodeSelect({ detail: { node: { entry } } });
                    fixture.detectChanges();
                }));

                it('should be null when the chosenNode is reset', async(() => {
                    fixture.detectChanges();

                    component.onNodeSelect({ detail: { node: { entry: <MinimalNodeEntryEntity> {} } } });
                    fixture.detectChanges();

                    component.select.subscribe((nodes) => {
                        expect(nodes).toBeDefined();
                        expect(nodes).toBeNull();
                        expect(component.chosenNode).toBeNull();
                        expect(component.isSelectionValid).not.toBeNull();
                    });

                    component.resetChosenNode();
                    fixture.detectChanges();
                }));
            });
        });
    });
});
