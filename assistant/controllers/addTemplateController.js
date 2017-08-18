angular.module('personalAssistant').controller('addTemplateController', addTemplateController);
addTemplateController.$inject = ['$rootScope', '$scope', '$log', '$stateParams', 'dboticaServices', '$state', '$parse', '$http', 'SweetAlert', 'doctorServices'];

function addTemplateController($rootScope, $scope, $log, $stateParams, dboticaServices, $state, $http, $parse, doctorServices, SweetAlert) {
    var addTemplate = this;

    addTemplate.templatePermissionsDiv = false;
    var activePermissions = [];
    addTemplate.Nurse = false;
    addTemplate.Doctor = false;
    addTemplate.Operator = false;
    addTemplate.Admin = false;
    addTemplate.permissionsList = [{ name: 'Nurse' }, { name: 'Doctor' }, { name: 'Operator' }, { name: 'Admin' }];
    addTemplate.templateNameToDisplay = '-Select Template Name-';
    var newTemplateObject = { 'name': 'New Template' };
    var selectTemplateObject = { 'name': '-Select Template Name-' };
    addTemplate.templatesList = [];
    var activeTemplate = {};
    var templateToEdit = {};
    var elementInTable;
    var billInvoice = {};
    dboticaServices.setInvoice(billInvoice);
    var sectionElementIndex;
    var selectFieldTypeString = '---Select Field Type---';
    addTemplate.newTemplateName = '';
    addTemplate.selectSectionNameDiv = true;
    addTemplate.showDropdownDiv = false;
    addTemplate.templateName = false;
    addTemplate.addBtn = false;
    addTemplate.addNewFieldBtn = true;
    addTemplate.editTemplateName = false;
    var organizationId = localStorage.getItem('orgId');
    addTemplate.sectionNameToDisplay = '-Select Section Name-';
    var selectSectionObject = { 'sectionName': '-Select Section Name-' };
    var sectionNameObject = { 'sectionName': 'New Section' };
    addTemplate.sectionNamesList = [];
    addTemplate.fieldTypesList = [];
    addTemplate.fieldType = "---Select Field Type---";
    addTemplate.fieldTypesList = [{ 'fieldName': '---Select Field Type---' }, { 'fieldName': 'TEXTBOX' }, { 'fieldName': 'CHECKBOX' }, { 'fieldName': 'DROPDOWN' }, { 'fieldName': 'TEXTAREA' }, { 'fieldName': 'BUTTON' }]
    addTemplate.sectionNamesList.push(sectionNameObject);
    addTemplate.newTemplateSection = false;
    addTemplate.fieldTypeDropdown = false;
    addTemplate.newLabelSection = false;
    addTemplate.showDropdownDiv = false;
    addTemplate.addedFieldsForDropdown = '';
    addTemplate.newSectionName = '';
    addTemplate.newLabelName = '';
    addTemplate.sectionElementsList = [];
    addTemplate.sectionElementsListToDisplay = [];
    var localActiveSectionsFields = [];
    var entitiesArray = [];
    var displayArray = [];
    addTemplate.itemsPerPage = 5;
    addTemplate.currentPage = 1;
    addTemplate.defaultValueTxtBox = false;
    addTemplate.defaultValueInTxtBox = '';
    var editTemplateNameFlag = false;

    addTemplate.selectTemplate = selectTemplate;
    addTemplate.addNewTemplate = addNewTemplate;
    addTemplate.addNewFieldModal = addNewFieldModal;
    addTemplate.selectFieldType = selectFieldType;
    addTemplate.selectSectionnameInModal = selectSectionnameInModal;
    addTemplate.addEntityToTemplate = addEntityToTemplate;
    addTemplate.editAnElement = editAnElement;
    addTemplate.pageChanged = pageChanged;
    addTemplate.editTemp = editTemp;
    addTemplate.deleteAnElement = deleteAnElement;
    addTemplate.permissionAddition = permissionAddition;

    var getTemplatesPromise = dboticaServices.getAllTemplates(organizationId, '', true);
    getTemplatesPromise.then(function(getTemplateSuccess) {
        var errorCode = getTemplateSuccess.data.errorCode;
        if (errorCode) {
            dboticaServices.logoutFromThePage(errorCode);
        } else {
            var getTemplateResponse = angular.fromJson(getTemplateSuccess.data.response);
            $log.log('template responses are----', getTemplateResponse);
            if (errorCode == null && getTemplateSuccess.data.success) {
                addTemplate.templatesList = _.filter(getTemplateResponse, function(entity) {
                    return entity.state == 'ACTIVE';
                });
                angular.copy(addTemplate.templatesList, localActiveSectionsFields);
                angular.forEach(localActiveSectionsFields, function(template) {
                    angular.forEach(template.templateFields, function(fieldEntity, key, value) {
                        $log.log('filed entity is --------', fieldEntity);
                        $log.log('key is-----', key);
                        $log.log('value is------', value);
                        if (fieldEntity.fieldState == 'ACTIVE') {
                            fieldEntity.keyValue = key;
                            fieldEntity.elementId = template.id;
                            fieldEntity.templateName = template.name;
                            fieldEntity.elementValues = dboticaServices.getStringValues(fieldEntity.restrictValues, fieldEntity.fieldType);
                            addTemplate.sectionElementsList.push(fieldEntity);
                        }
                    });
                });
                addTemplate.totalItems = addTemplate.sectionElementsList.length;
                angular.copy(addTemplate.sectionElementsList, entitiesArray);
                displayArray = _.chunk(entitiesArray, addTemplate.itemsPerPage);
                angular.copy(displayArray[0], addTemplate.sectionElementsListToDisplay);
                addTemplate.templatesList.push(newTemplateObject);
                addTemplate.templatesList.unshift(selectTemplateObject);
            }
        }
    }, function(getTemplateError) {
        dboticaServices.noConnectivityError();
    });

    function permissionAddition(permission) {
        addTemplate[permission] = !addTemplate[permission];
        switch (permission) {
            case 'Nurse':
                sortPermission('NURSE');
                break;
            case 'Doctor':
                sortPermission('DOCTOR');
                break;
            case 'Admin':
                sortPermission('HOSPITAL_ADMIN');
                break;
            case 'Operator':
                sortPermission('LAB_OPERATOR');
                break;
        }
    }

    function sortPermission(permission) {
        var permissionIndex = _.findLastIndex(activePermissions, function(entity) {
            return entity == permission;
        });
        if (permissionIndex == -1) {
            activePermissions.push(permission);
        } else {
            activePermissions.splice(permissionIndex, 1);
        }
    }

    function selectTemplate(template) {
        editTemplateNameFlag = false;
        addTemplate.templateNameToDisplay = template.name;
        if (template.name == 'New Template') {
            activeTemplate = {};
            addTemplate.templatePermissionsDiv = true;
            addTemplate.newTemplateName = '';
            addTemplate.addNewFieldBtn = false;
            addTemplate.templateName = true;
            addTemplate.addBtn = true;
            addTemplate.editTemplateName = false;
        } else {
            if (template.name !== '-Select Template Name-') {
                addTemplate.editTemplateName = true;
                activeTemplate = template;
            }
            if (template.name == '-Select Template Name-') {
                addTemplate.editTemplateName = false;
                addTemplate.templatePermissionsDiv = false;
            }
            addTemplate.addNewFieldBtn = true;
            addTemplate.templateName = false;
            addTemplate.addBtn = false;
        }
    }

    function addNewTemplate() {
        if (addTemplate.templateName && addTemplate.addBtn && addTemplate.newTemplateName !== '' && activePermissions.length > 0) {
            var addTemplateRequestEntity = {};
            if (editTemplateNameFlag && addTemplate.templateNameToDisplay !== 'New Template' && addTemplate.templateNameToDisplay !== '-Select Template Name-') {
                angular.copy(activeTemplate, addTemplateRequestEntity);
                addTemplateRequestEntity.name = addTemplate.newTemplateName;
            } else {
                addTemplateRequestEntity.organizationId = organizationId;
                addTemplateRequestEntity.permissions = activePermissions;
                addTemplateRequestEntity.name = addTemplate.newTemplateName;
                addTemplateRequestEntity.visibility = 'ACTIVE';
                addTemplateRequestEntity.templateFields = [];
            }
            var addTemplatePromise = dboticaServices.addFieldRequest(addTemplateRequestEntity);
            addTemplatePromise.then(function(addTemplateSuccess) {
                var errorCode = addTemplateSuccess.data.errorCode;
                if (errorCode) {
                    dboticaServices.logoutFromThePage(errorCode);
                } else {
                    var addTemplateResponse = angular.fromJson(addTemplateSuccess.data.response);
                    if (errorCode == null && addTemplateSuccess.data.success) {
                        dboticaServices.newTemplateSuccessSwal();
                        addTemplate.newTemplateName = '';
                        if (!editTemplateNameFlag) {
                            addTemplate.templatesList.splice(1, 0, addTemplateResponse);
                        } else {
                            var templateIndex = _.findLastIndex(addTemplate.templatesList, function(templateEntity) {
                                return templateEntity.id !== undefined && templateEntity.id == addTemplateResponse.id;
                            });
                            angular.forEach(entitiesArray, function(sectionEntity) {
                                if (sectionEntity.elementId == addTemplateResponse.id) {
                                    sectionEntity.templateName = addTemplateResponse.name;
                                }
                            });
                            pageChanged();
                            addTemplate.templatesList.splice(templateIndex, 1, addTemplateResponse);
                            addTemplate.templateNameToDisplay = addTemplateResponse.name;
                            angular.copy(addTemplateResponse, activeTemplate);
                            addTemplate.templateName = false;
                            addTemplate.templatePermissionsDiv = false;
                            addTemplate.addBtn = false;
                        }
                    }
                }
            }, function(addTemplateError) {
                dboticaServices.noConnectivityError();
            });
        } else {
            dboticaServices.addTemplateNameSwal();
        }
    }

    function addNewFieldModal() {
        templateToEdit = {};
        if (!_.isEmpty(activeTemplate)) {
            angular.element('#addNewFieldModal').modal('show');
            addTemplate.defaultValueInTxtBox = '';
            addTemplate.selectSectionNameDiv = true;
            addTemplate.newTemplateSection = false;
            addTemplate.newLabelSection = false;
            addTemplate.fieldTypeDropdown = false;
            addTemplate.showDropdownDiv = false;
            var sectionObjectsList = _.filter(activeTemplate.templateFields, function(templateEntity) {
                if (templateEntity.fieldState == 'ACTIVE') {
                    return templateEntity;
                }
            });
            addTemplate.sectionNamesList = _.uniqBy(sectionObjectsList, 'sectionName');
            addTemplate.sectionNamesList.unshift(selectSectionObject);
            addTemplate.sectionNamesList.push(sectionNameObject);
        } else {
            dboticaServices.selectTemplateSwal();
        }
    }

    function selectSectionnameInModal(selectedSection) {
        addTemplate.sectionNameToDisplay = selectedSection.sectionName;
        if (selectedSection.sectionName == 'New Section') {
            addTemplate.newTemplateSection = true;
            addTemplate.newLabelSection = true;
            addTemplate.fieldTypeDropdown = true;
        } else {
            addTemplate.newLabelSection = true;
            addTemplate.fieldTypeDropdown = true;
            addTemplate.newTemplateSection = false;
        }
    }

    function selectFieldType(fieldType) {
        addTemplate.fieldType = fieldType.fieldName;
        switch (addTemplate.fieldType) {
            case 'TEXTBOX':
                selectedFieldTypeIs = 'TEXT_BOX';
                addTemplate.defaultValueTxtBox = true;
                addTemplate.showDropdownDiv = false;
                break;
            case 'CHECKBOX':
                selectedFieldTypeIs = 'CHECK_BOX';
                addTemplate.defaultValueTxtBox = false;
                addTemplate.showDropdownDiv = true;
                break;
            case 'DROPDOWN':
                selectedFieldTypeIs = 'DROPDOWN';
                addTemplate.defaultValueTxtBox = false;
                addTemplate.showDropdownDiv = true;
                break;
            case 'TEXTAREA':
                selectedFieldTypeIs = 'TEXT_AREA';
                addTemplate.defaultValueTxtBox = true;
                addTemplate.showDropdownDiv = false;
                break;
            case 'BUTTON':
                selectedFieldTypeIs = 'BUTTON';
                addTemplate.defaultValueTxtBox = false;
                addTemplate.showDropdownDiv = false;
                break;
            case '---Select Field Type---':
                addTemplate.defaultValueTxtBox = false;
                addTemplate.showDropdownDiv = false;
                break;
        }
    }

    function addEntityToTemplate() {
        if (_.isEmpty(templateToEdit)) {
            if (addTemplate.sectionNameToDisplay !== '-Select Section Name-' && addTemplate.fieldType !== '---Select Field Type---') {
                var requestEntity = {};
                requestEntity.templateFields = [];
                var check = false;
                var newSectionFlag = false;
                $log.log('active template is------', activeTemplate);
                angular.copy(activeTemplate, requestEntity);
                var templateFieldObject = {};
                if (addTemplate.sectionNameToDisplay == 'New Section') {
                    newSectionFlag = true;
                    templateFieldObject.sectionName = addTemplate.newSectionName;
                    check = addTemplate.newSectionName !== '' && addTemplate.newLabelName !== '' && addTemplate.fieldType !== '---Select Field Type---';
                }
                if (addTemplate.sectionNameToDisplay !== 'New Section' && addTemplate.sectionNameToDisplay !== '-Select Section Name-') {
                    templateFieldObject.sectionName = addTemplate.sectionNameToDisplay;
                    check = addTemplate.newLabelName !== '' && addTemplate.fieldType !== '---Select Field Type---';
                }
                templateFieldObject.name = addTemplate.newLabelName;
                templateFieldObject.headerFieldName = '';
                templateFieldObject.tableHeaders = [];
                templateFieldObject.fieldState = 'ACTIVE';
                templateFieldObject.mandatory = true;
                templateFieldObject.minValue = '';
                templateFieldObject.maxValue = '';
                templateFieldObject.value = '';
                templateFieldObject.fieldType = selectedFieldTypeIs;
                if (selectedFieldTypeIs == 'TEXT_BOX' || selectedFieldTypeIs == 'BUTTON' || selectedFieldTypeIs == 'TEXT_AREA') {
                    templateFieldObject.restrictValues = [];
                    templateFieldObject.description = addTemplate.defaultValueInTxtBox;
                }
                if (selectedFieldTypeIs == 'DROPDOWN') {
                    var dropdownFields = [];
                    templateFieldObject.restrictValues = [];
                    dropdownFields = _.split(addTemplate.addedFieldsForDropdown, ',');
                    templateFieldObject.description = dropdownFields[0];
                    angular.forEach(dropdownFields, function(dropdownEntity) {
                        var localFieldObject = {};
                        localFieldObject.name = dropdownEntity;
                        localFieldObject.value = dropdownEntity;
                        templateFieldObject.restrictValues.push(localFieldObject);
                    });
                }
                if (selectedFieldTypeIs == 'CHECK_BOX') {
                    var checkboxFields = [];
                    templateFieldObject.restrictValues = [];
                    templateFieldObject.description = '';
                    checkBoxFields = _.split(addTemplate.addedFieldsForDropdown, ',');
                    angular.forEach(checkBoxFields, function(checkBoxEntity) {
                        var localCheckObject = {};
                        localCheckObject.name = checkBoxEntity;
                        localCheckObject.checkBoxValue = false;
                        templateFieldObject.restrictValues.push(localCheckObject);
                    });
                }
                requestEntity.templateFields.push(templateFieldObject);
                if (check) {
                    var addSectionPromise = dboticaServices.addFieldRequest(requestEntity);
                    addSectionPromise.then(function(addSectionSuccess) {
                        var errorCode = addSectionSuccess.data.errorCode;
                        if (errorCode) {
                            dboticaServices.logoutFromThePage(errorCode);
                        } else {
                            var addSectionResponse = angular.fromJson(addSectionSuccess.data.response);
                            if (errorCode == null && addSectionSuccess.data.success) {
                                angular.copy(addSectionResponse, activeTemplate);
                                var templateIndex = dboticaServices.getReqTemplate(localActiveSectionsFields, addSectionResponse);
                                localActiveSectionsFields.splice(templateIndex, 1, addSectionResponse);
                                dboticaServices.fieldDetailsUpdateSuccessSwal();
                                var newField = addSectionResponse.templateFields.pop();
                                if (newSectionFlag) {
                                    addTemplate.sectionNamesList.splice(1, 0, newField);
                                }
                                newField.keyValue = entitiesArray.length;
                                newField.elementId = addSectionResponse.id;
                                newField.templateName = addSectionResponse.name;
                                newField.elementValues = dboticaServices.getStringValues(newField.restrictValues, newField.fieldType);
                                if (addTemplate.sectionElementsListToDisplay.length < addTemplate.itemsPerPage) {
                                    addTemplate.sectionElementsListToDisplay.unshift(newField);
                                    entitiesArray.push(newField);
                                } else {
                                    if (displayArray.length == addTemplate.currentPage || displayArray.length == parseInt(1)) {
                                        addTemplate.sectionElementsListToDisplay = [];
                                        addTemplate.currentPage = addTemplate.currentPage + 1;
                                        addTemplate.sectionElementsListToDisplay.unshift(newField);
                                    }
                                    entitiesArray.unshift(newField);
                                    if (addTemplate.sectionElementsListToDisplay.length == addTemplate.itemsPerPage && displayArray.length !== parseInt(1)) {
                                        addTemplate.currentPage = 1;
                                        displayArray = _.chunk(entitiesArray, addTemplate.itemsPerPage);
                                        angular.copy(displayArray[0], addTemplate.sectionElementsListToDisplay);
                                    }
                                }
                                displayArray = _.chunk(entitiesArray, addTemplate.itemsPerPage);
                                addTemplate.totalItems = entitiesArray.length;
                                addTemplate.newSectionName = '';
                                addTemplate.newLabelName = '';
                                addTemplate.newTemplateSection = false;
                                addTemplate.showDropdownDiv = false;
                                addTemplate.sectionNameToDisplay = '-Select Section Name-';
                                addTemplate.fieldType = '---Select Field Type---';
                            }
                        }
                    }, function(addSectionError) {
                        dboticaServices.noConnectivityError();
                    });
                } else {
                    dboticaServices.templateMandatoryFieldsSwal();
                }
            } else {
                dboticaServices.templateMandatoryFieldsSwal();
            }
        } else {
            var editTemplateRequestEntity = {};
            angular.copy(templateToEdit, editTemplateRequestEntity);
            editTemplateRequestEntity.templateFields[sectionElementIndex].name = addTemplate.newLabelName;
            if (editTemplateRequestEntity.templateFields[sectionElementIndex].fieldType == 'CHECK_BOX') {
                var checkboxFields = [];
                editTemplateRequestEntity.templateFields[sectionElementIndex].restrictValues = [];
                checkBoxFields = _.split(addTemplate.addedFieldsForDropdown, ',');
                angular.forEach(checkBoxFields, function(checkBoxEntity) {
                    var localCheckObject = {};
                    localCheckObject.name = checkBoxEntity;
                    localCheckObject.checkBoxValue = false;
                    editTemplateRequestEntity.templateFields[sectionElementIndex].restrictValues.push(localCheckObject);
                });
            }
            if (editTemplateRequestEntity.templateFields[sectionElementIndex].fieldType == 'DROPDOWN') {
                var dropdownFields = [];
                editTemplateRequestEntity.templateFields[sectionElementIndex].restrictValues = [];
                dropdownFields = _.split(addTemplate.addedFieldsForDropdown, ',');
                editTemplateRequestEntity.templateFields[sectionElementIndex].description = dropdownFields[0];
                angular.forEach(dropdownFields, function(dropdownEntity) {
                    var localFieldObject = {};
                    localFieldObject.name = dropdownEntity;
                    localFieldObject.value = dropdownEntity;
                    editTemplateRequestEntity.templateFields[sectionElementIndex].restrictValues.push(localFieldObject);
                });
            }
            if (addTemplate.newLabelSection !== undefined && addTemplate.newLabelSection !== '') {
                var editPromise = dboticaServices.addFieldRequest(editTemplateRequestEntity);
                editPromise.then(function(editTemplateSuccess) {
                    var errorCode = editTemplateSuccess.data.errorCode;
                    if (errorCode) {
                        dboticaServices.logoutFromThePage(errorCode);
                    } else {
                        var editTemplateResponse = angular.fromJson(editTemplateSuccess.data.response);
                        if (errorCode == null && editTemplateSuccess.data.success) {
                            dboticaServices.editFieldSuccessSwal();
                            angular.element('#addNewFieldModal').modal('hide');
                            var templateIndex = dboticaServices.getReqTemplate(localActiveSectionsFields, editTemplateResponse);
                            localActiveSectionsFields.splice(templateIndex, 1, editTemplateResponse);
                            var editIndex = _.findLastIndex(entitiesArray, function(sectionEntity) {
                                return sectionEntity.name == elementInTable.name && sectionEntity.fieldType == elementInTable.fieldType;
                            });
                            entitiesArray[editIndex].name = editTemplateResponse.templateFields[sectionElementIndex].name;
                            if (editTemplateResponse.templateFields[sectionElementIndex].fieldType == 'DROPDOWN') {
                                var fieldValues = [];
                                fieldValues = dboticaServices.getDropdownValues(editTemplateResponse.templateFields[sectionElementIndex].restrictValues);
                                entitiesArray[editIndex].elementValues = _.join(fieldValues, ',');
                            }
                            if (editTemplateResponse.templateFields[sectionElementIndex].fieldType == 'CHECK_BOX') {
                                var fieldValues = [];
                                fieldValues = dboticaServices.getCheckBoxValues(editTemplateResponse.templateFields[sectionElementIndex].restrictValues);
                                entitiesArray[editIndex].elementValues = _.join(fieldValues, ',');
                            }
                        }
                        displayArray = _.chunk(entitiesArray, addTemplate.itemsPerPage);
                        angular.copy(displayArray[addTemplate.currentPage - 1], addTemplate.sectionElementsListToDisplay);
                    }
                }, function(editTemplateError) {
                    dboticaServices.noConnectivityError();
                });
            }
        }
    }

    function editAnElement(elementToEdit, index) {
        elementInTable = elementToEdit;
        angular.element('#addNewFieldModal').modal('show');
        addTemplate.templatePermissionsDiv = true;

        addTemplate.selectSectionNameDiv = false;
        addTemplate.newLabelSection = true;
        addTemplate.newTemplateSection = false;
        addTemplate.fieldTypeDropdown = false;
        addTemplate.showDropdownDiv = false;
        addTemplate.newLabelName = elementToEdit.name;
        if (elementToEdit.fieldType == 'CHECK_BOX' || elementToEdit.fieldType == 'DROPDOWN') {
            addTemplate.showDropdownDiv = true;
            addTemplate.addedFieldsForDropdown = elementToEdit.elementValues;
        }
        templateToEdit = {};
        templateToEdit = dboticaServices.getTemplateId(addTemplate.templatesList, elementToEdit);
        sectionElementIndex = _.findLastIndex(templateToEdit.templateFields, function(resEntity) {
            return resEntity.name == elementToEdit.name && resEntity.fieldType == elementToEdit.fieldType;
        });
    }

    function editPermissions(permissionsList) {
        angular.forEach(permissionsList, function(permissionEntity) {
            switch (permissionEntity) {
                case 'NURSE':
                    addTemplate.Nurse = true;
                    break;
                case 'DOCTOR':
                    addTemplate.Doctor = true;
                    break;
                case 'HOSPITAL_ADMIN':
                    addTemplate.Admin = true;
                    break;
                case 'LAB_OPERATOR':
                    addTemplate.Operator = true;
                    break;
            }
        });
    }

    function pageChanged() {
        var requiredIndex = addTemplate.currentPage - 1;
        displayArray = [];
        displayArray = _.chunk(entitiesArray, addTemplate.itemsPerPage);
        angular.copy(displayArray[requiredIndex], addTemplate.sectionElementsListToDisplay);
    }

    function deleteAnElement(elementToDelete, index) {
        swal({
                title: "Are you sure?",
                text: "You will not be able to recover Field Details!",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Yes, delete it!",
                closeOnConfirm: false
            },
            function() {
                var deleteIndex;
                var fieldToDeleteFromTemplateIndex = dboticaServices.getReqTemplateToDelete(localActiveSectionsFields, elementToDelete.elementId);
                var templateObject = localActiveSectionsFields[fieldToDeleteFromTemplateIndex];
                angular.forEach(templateObject.templateFields, function(templateFieldEntity, key, value) {
                    if (templateFieldEntity.name == elementToDelete.name && templateFieldEntity.fieldType == elementToDelete.fieldType) {
                        templateFieldEntity.fieldState = 'INACTIVE';
                        deleteIndex = key;
                    }
                });
                var deleteFieldPromise = dboticaServices.addFieldRequest(templateObject);
                deleteFieldPromise.then(function(deleteFieldEntity) {
                    var errorCode = deleteFieldEntity.data.errorCode;
                    if (errorCode) {
                        dboticaServices.logoutFromThePage(errorCode);
                    } else {
                        var deleteFieldResponse = angular.fromJson(deleteFieldEntity.data.response);
                        if (errorCode == null && deleteFieldEntity.data.success) {
                            var templateIndex = dboticaServices.getReqTemplate(localActiveSectionsFields, deleteFieldResponse);
                            localActiveSectionsFields.splice(templateIndex, 1, deleteFieldResponse);
                            var editIndex = _.findLastIndex(entitiesArray, function(sectionEntity) {
                                return sectionEntity.name == elementToDelete.name && sectionEntity.fieldType == elementToDelete.fieldType;
                            });
                            addTemplate.sectionElementsListToDisplay.splice(index, 1);
                            entitiesArray.splice(editIndex, 1);
                            displayArray = _.chunk(entitiesArray, addTemplate.itemsPerPage);
                            dboticaServices.deleteFieldSuccessSwal();
                            addTemplate.totalItems = entitiesArray.length;
                            angular.copy(displayArray[addTemplate.currentPage - 1], addTemplate.sectionElementsListToDisplay);
                        }
                    }
                }, function(deleteFieldError) {
                    dboticaServices.noConnectivityError();
                });
            }
        );
    }

    function editTemp() {
        if (!_.isEmpty(activeTemplate)) {
            addTemplate.templateName = true;
            editTemplateNameFlag = true;
            addTemplate.templatePermissionsDiv = true;
            activePermissions = activeTemplate.permissions;
            editPermissions(activeTemplate.permissions);
            addTemplate.newTemplateName = activeTemplate.name;
            addTemplate.addBtn = true;
        };
    }
}
