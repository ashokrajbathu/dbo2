angular.module('personalAssistant').controller('permissionsController', permissionsController);
permissionsController.$inject = ['$rootScope', '$scope', '$location', '$log', '$stateParams', 'dboticaServices', '$state', '$parse', '$http', 'SweetAlert', 'doctorServices'];

function permissionsController($rootScope, $scope, $location, $log, $stateParams, dboticaServices, $state, $http, $parse, doctorServices, SweetAlert) {
    var permissions = this;


    permissions.assistantDetails = {};
    permissions.assistantDetails.firstName = '';
    permissions.assistantDetails.city = '';
    permissions.assistantDetails.emailId = '';
    permissions.assistantDetails.password = '';
    permissions.assistantDetails.phoneNumber = '';
    permissions.assistantDetails.gender = 'MALE';
    permissions.assistantDetails.assistantPermissions = [];
    permissions.mandatoryFields = false;
    var localAssistantPermissions = [];
    var permissionsReq = [];
    permissions.assistantList = [];
    var activeAssistant = {};
    var selectAssistantObject = { 'firstName': '---Select Assistant---' };
    permissions.assistantNameToDisplay = '---Select Assistant---';
    var newAssistantObject = { 'firstName': 'New Assistant' };
    var editAssistantFlag = false;

    permissions.addAssistant = addAssistant;
    permissions.selectPermissions = selectPermissions;
    permissions.selectAssistant = selectAssistant;

    emptyAllPermissions();

    var organizationId = localStorage.getItem('orgId');
    getAssistantsOnLoad();

    function getAssistantsOnLoad() {
        permissions.assistantList = [];
        var getAssistantsPromise = dboticaServices.getOrganizationAssistants(organizationId);
        getAssistantsPromise.then(function(getAssistantsSuccess) {
            var errorCode = getAssistantsSuccess.data.errorCode;
            if (errorCode) {
                dboticaServices.logoutFromThePage(errorCode);
            } else {
                var assistantsResponse = angular.fromJson(getAssistantsSuccess.data.response);
                permissions.assistantList = _.filter(assistantsResponse, function(entity) {
                    return entity.state == 'ACTIVE';
                });
                permissions.assistantList.unshift(selectAssistantObject);
                permissions.assistantList.push(newAssistantObject);
            }
        }, function(getAssistantsError) {
            dboticaServices.noConnectivityError();
        });
    }

    function selectPermissions(permission) {
        var permissionIndex = _.findLastIndex(localAssistantPermissions, function(assistantEntity) {
            return assistantEntity == permission;
        });
        if (permissionIndex !== -1) {
            localAssistantPermissions.splice(permissionIndex, 1);
        } else {
            localAssistantPermissions.push(permission);
        }
    }

    function selectAssistant(assistant) {
        permissions.assistantNameToDisplay = assistant.firstName;
        if (assistant.firstName !== '---Select Assistant---' && assistant.firstName !== 'New Assistant') {
            angular.copy(assistant, permissions.assistantDetails);
            checkPermissions(assistant.assistantPermissions);
            angular.copy(assistant, activeAssistant);
            angular.copy(assistant.assistantPermissions, localAssistantPermissions);
        } else {
            activeAssistant = {};
            permissions.assistantDetails = {};
            emptyAllPermissions();
        }
    }

    function addAssistant() {
        var assistantRequest = {};
        editAssistantFlag = false;
        if (permissions.assistantNameToDisplay !== '---Select Assistant---' && permissions.assistantNameToDisplay !== 'New Assistant') {
            assistantRequest.id = activeAssistant.id;
            editAssistantFlag = true;
        }
        assistantRequest.assistantPermissions = [];
        var check = (permissions.assistantDetails.firstName !== '' && permissions.assistantDetails.city !== '' && permissions.assistantDetails.emailId !== '' && permissions.assistantDetails.password !== '' && permissions.assistantDetails.phoneNumber !== '' && permissions.assistantDetails.assistantPermissions !== [] && localAssistantPermissions.length !== 0);
        if (check) {
            permissions.mandatoryFields = false;
            angular.copy(permissions.assistantDetails, assistantRequest);
            assistantRequest.assistantPermissions = localAssistantPermissions;
            assistantRequest.organizationId = organizationId;
            assistantRequest.userName = permissions.assistantDetails.emailId;
            var addAssistantPromise = dboticaServices.assistantAddition(assistantRequest);
            addAssistantPromise.then(function(addAssistantSuccess) {
                var errorCode = addAssistantSuccess.data.errorCode;
                if (errorCode) {
                    dboticaServices.logoutFromThePage(errorCode);
                } else {
                    var addAssistantResponse = angular.fromJson(addAssistantSuccess.data.response);
                    if (errorCode == null && addAssistantSuccess.data.success) {
                        emptyAllPermissions();
                        if (editAssistantFlag) {
                            getAssistantsOnLoad();
                        }
                        activeAssistant = {};
                        permissions.assistantNameToDisplay = '---Select Assistant---';
                        permissions.assistantDetails = {};
                        dboticaServices.addAssistantSuccessSwal();
                    }
                }
            }, function(addAssistantError) {
                dboticaServices.noConnectivityError();
            });
        } else {
            permissions.mandatoryFields = true;
        }
    }


    function emptyAllPermissions() {
        permissions.patientManagement = false;
        permissions.billManagement = false;
        permissions.inventoryManagement = false;
        permissions.organizationManagement = false;
        permissions.hospitalAdmin = false;
        permissions.nurse = false;
        permissions.operator = false;
        permissions.labOperator = false;
    }

    function checkPermissions(permissionsArray) {
        angular.forEach(permissionsArray, function(arrayEntity) {
            switch (arrayEntity) {
                case 'PATIENT_MANAGEMENT':
                    permissions.patientManagement = true;
                    break;
                case 'BILLING_MANAGEMENT':
                    permissions.billManagement = true;
                    break;
                case 'INVENTORY_MANAGEMENT':
                    permissions.inventoryManagement = true;
                    break;
                case 'ORGANIZATION_MANAGEMENT':
                    permissions.organizationManagement = true;
                    break;
                case 'HOSPITAL_ADMIN':
                    permissions.hospitalAdmin = true;
                    break;
                case 'NURSE':
                    permissions.nurse = true;
                    break;
                case 'OPERATOR':
                    permissions.operator = true;
                    break;
                case 'LAB_OPERATOR':
                    permissions.labOperator = true;
                    break;
            }
        });
    }
}
