/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


define(function(require) {
	'use strict';

	var Backbone = require('backbone');
	var XAEnums = require('utils/XAEnums');
	var XAGlobals = require('utils/XAGlobals');
	var XAUtils = require('utils/XAUtils');
	var localization = require('utils/XALangSupport');
        var XAUtil = require('utils/XAUtils');

	var RangerPolicyROTmpl = require('hbs!tmpl/policies/RangerPolicyRO_tmpl');
	var RangerService = require('models/RangerService');

	var RangerPolicyRO = Backbone.Marionette.Layout.extend({
		_viewName: 'RangerPolicyRO',

		template: RangerPolicyROTmpl,
		templateHelpers: function() {
            var isDelegatAdminChk;
            var policyType = XAUtil.enumElementByValue(XAEnums.RangerPolicyType, this.policy.get('policyType'));
            if(this.policyDetails.serviceType !== XAEnums.ServiceType.SERVICE_TAG.label
                && !XAUtils.isMaskingPolicy(this.policy.get('policyType'))
                && !XAUtils.isRowFilterPolicy(this.policy.get('policyType'))) {
                isDelegatAdminChk = true;
            } else {
            	isDelegatAdminChk = false;
            }
			return {
				PolicyDetails: this.policyDetails,
                isDelegatAdmin: isDelegatAdminChk,
                policyType: policyType.label
			};
		},
		breadCrumbs: [],

		/** Layout sub regions */
		regions: {
			//'rAuditTable'	: 'div[data-id="r_auditTable"]',
		},

		/** ui selector cache */
		ui: {

		},

		/** ui events hash */
		events: function() {
			var events = {};
			return events;
		},

		/**
		 * intialize a new RangerPolicyRO Layout
		 * @constructs
		 */
		initialize: function(options) {
			_.extend(this, options);
			this.initializePolicy();
			this.initializePolicyDetailsObj();
		},

		initializePolicy: function() {
			var data = {
				eventTime : this.eventTime,
			};
            if(!_.isEmpty(this.eventTime)){
                this.policy.fetchByEventTime({
                    async: false,
                    cache: false,
                    data : data,
                    error : function(error , response){
                            if (response && response.status === 419 ) {
                                    XAUtils.defaultErrorHandler(error , response);
                            } else {
                                    XAUtils.showErrorMsg(response.responseJSON.msgDesc);
                            }
                    }
                });
            }else{
                this.policy = this.model;
                this.serviceDef = this.rangerService;
            }
		},

		initializePolicyDetailsObj : function(){
            if(!_.isUndefined(this.eventTime)){
                // In this.policy service type is undefined then we take repotype.
                if(_.isUndefined(this.policy.get('serviceType'))){
                        this.serviceDef = this.serviceDefList.findWhere({'id' : this.repoType})
                }else{
                        this.serviceDef = this.serviceDefList.findWhere({'name':this.policy.get('serviceType')});
                }
            }
			var self = this , resourceDef;
			var details = this.policyDetails = {};
			details.id = this.policy.get('id');
			details.name = this.policy.get('name');
			details.isEnabled = this.policy.get('isEnabled') ? localization.tt('lbl.ActiveStatus_STATUS_ENABLED') : localization.tt('lbl.ActiveStatus_STATUS_DISABLED');
                        details.policyPriority = this.policy.get('policyPriority') == 1 ? localization.tt('lbl.override') : localization.tt('lbl.normal');
			details.description = this.policy.get('description');
			details.isAuditEnabled = this.policy.get('isAuditEnabled') ? XAEnums.AuditStatus.AUDIT_ENABLED.label : XAEnums.AuditStatus.AUDIT_DISABLED.label;
			details.resources = [];
			details.service = this.policy.get('service');
			details.serviceType = this.serviceDef.get('name');
			details.isRecursive = undefined;
            if(XAUtils.isAccessPolicy(this.policy.get('policyType'))){
                resourceDef = this.serviceDef.get('resources');
            }else{
                if(XAUtils.isMaskingPolicy(this.policy.get('policyType'))){
                    resourceDef = this.serviceDef.get('dataMaskDef').resources;
                }else{
                    resourceDef = this.serviceDef.get('rowFilterDef').resources;
                }
            }
            _.each(resourceDef, function(def, i){
				if(!_.isUndefined(this.policy.get('resources')[def.name])){
					var resource = {},
						policyResources = this.policy.get('resources')[def.name];
					resource.label = def.label;
					resource.values = policyResources.values;
					if(def.recursiveSupported){
						details.isRecursive = policyResources.isRecursive ? 'ON': 'OFF';
					} else if(def.excludesSupported){
						resource.Rec_Exc = policyResources.isExcludes ? XAEnums.ExcludeStatus.STATUS_EXCLUDE.label : XAEnums.ExcludeStatus.STATUS_INCLUDE.label;
					}
					details.resources.push(resource);
				}
			}, this);
                        details.policyLabels = this.policy.get('policyLabels');
			var perm = details.permissions = this.getPermHeaders();
			perm.policyItems	 = this.policy.get('policyItems');
			perm.allowException  = this.policy.get('allowExceptions');
			perm.denyPolicyItems = this.policy.get('denyPolicyItems');
			perm.denyExceptions  = this.policy.get('denyExceptions');
            if(this.policy.get('dataMaskPolicyItems')){
	            _.each(this.policy.get('dataMaskPolicyItems'), function(mask){
	                var maskingInfo = _.find(self.serviceDef.get("dataMaskDef").maskTypes, function(m){
	                	return m.name == mask.dataMaskInfo.dataMaskType;
	                });
	                if(maskingInfo){
	                	_.extend(mask.dataMaskInfo , _.pick(maskingInfo, 'label'));	
	                }
	            })
	            perm.maskingPolicy  = this.policy.get('dataMaskPolicyItems');
            }
            perm.rowLevelPolicy  = this.policy.get('rowFilterPolicyItems');
			details.createdBy  = this.policy.get('createdBy');
			details.createTime = Globalize.format(new Date(this.policy.get('createTime')),  "MM/dd/yyyy hh:mm tt");
			details.updatedBy = this.policy.get('updatedBy');
			details.updateTime = Globalize.format(new Date(this.policy.get('updateTime')),  "MM/dd/yyyy hh:mm tt");
                        if(this.policy.has('validitySchedules')){
                                details.validitySchedules = this.policy.get('validitySchedules');
                        }
			//get policyItems
			this.createPolicyItems();
			
		},
		createPolicyItems : function(){
			this.policyDetails['policyItemsCond'] = [];
			var headers = this.getPermHeaders(), items = [];
			this.policyDetails['policyCondition'] = headers.policyCondition;
            if(XAUtils.isAccessPolicy(this.policy.get('policyType'))){
                items = [{'itemName': 'policyItems',title : 'Allow Condition'}];
            }
            if(XAUtils.isRowFilterPolicy(this.policy.get('policyType'))){
                items.push({'itemName': 'rowFilterPolicyItems',title : 'Row Level Conditions'});
            }
            if(XAUtils.isMaskingPolicy(this.policy.get('policyType'))){
                items.push({'itemName': 'dataMaskPolicyItems',title : 'Masking Conditions'});
            }
            if(JSON.parse(this.serviceDef.get('options').enableDenyAndExceptionsInPolicies) && XAUtils.isAccessPolicy(this.policy.get('policyType'))){
                items.push({'itemName': 'allowExceptions',title : 'Exclude from Allow Conditions'},
                          {'itemName': 'denyPolicyItems',title : 'Deny Condition'},
                          {'itemName': 'denyExceptions',title : 'Exclude from Deny Conditions'});
            }
			_.each(items, function(item){
                if(!_.isUndefined(this.policy.get(item.itemName))){
					this.policyDetails['policyItemsCond'].push({ title : item.title, headers : headers.header, policyItems : this.policy.get(item.itemName)})
				}
			}, this)
		},

		/** all events binding here */
		bindEvents: function() {},

		/** on render callback */
		onRender: function() {
			this.$el.find('#permissionsDetails table tr td:empty').html('-');
			if(this.$el.find('#permissionsDetails table tbody tr').length == 0){
				this.$el.find('#permissionsDetails table tbody').append('<tr><td colspan="5">'+ localization.tt("msg.noRecordsFound") +'</td></tr>');
			}
		},

		getPermHeaders : function(){
			var permList = [], 
            policyCondition = false;
            if(this.policyDetails.serviceType !== XAEnums.ServiceType.SERVICE_TAG.label
                && !XAUtils.isMaskingPolicy(this.policy.get('policyType'))
                && !XAUtils.isRowFilterPolicy(this.policy.get('policyType'))){
                permList.unshift(localization.tt('lbl.delegatedAdmin'));
            }
            if(XAUtils.isRowFilterPolicy(this.policy.get('policyType'))){
                permList.unshift(localization.tt('lbl.rowLevelFilter'));
            }
            if(XAUtils.isMaskingPolicy(this.policy.get('policyType'))){
                permList.unshift(localization.tt('lbl.selectMaskingOption'));
            }
            if(XAUtils.isRowFilterPolicy(this.policy.get('policyType')) || XAUtils.isMaskingPolicy(this.policy.get('policyType'))){
                permList.unshift(localization.tt('lbl.accessTypes'));
            }else{
                permList.unshift(localization.tt('lbl.permissions'));
            }
			if(!_.isEmpty(this.serviceDef.get('policyConditions'))){
				permList.unshift(localization.tt('h.policyCondition'));
				policyCondition = true;
			}
			permList.unshift(localization.tt('lbl.selectUser'));
			permList.unshift(localization.tt('lbl.selectGroup'));
			return {
				header : permList,
				policyCondition : policyCondition
			};
		},

		nextVer : function(e){
			var $el = $(e.currentTarget);
			if($el.hasClass('active')){
				var curr = this.policy.get('version');
				this.getPolicyByVersion(++curr, e);
			}
		},

		previousVer : function(e){
			var $el = $(e.currentTarget);
			if($el.hasClass('active')){
				var curr = this.policy.get('version');
				this.getPolicyByVersion(--curr, e);
			}
		},

		getPolicyByVersion : function(ver, e){
			//to support old policy log after updating that policy.
			this.policy.set('serviceType',undefined);
			this.policy.fetchByVersion(ver, {
				cache : false,
				async : false
			});
			this.initializePolicyDetailsObj();
			this.render();
			var verEl = $(e.currentTarget).parent();
			verEl.find('text').text('Version '+this.policy.get('version'));
			var prevEl = verEl.find('#preVer'),
				nextEl = verEl.find('#nextVer');
			if(this.policy.get('version')>1){
				prevEl.addClass('active');
			}else{
				prevEl.removeClass('active');
			}
			var policyVerIndexAt = this.policyVersionList.indexOf(this.policy.get('version').toString());
			if(!_.isUndefined(this.policyVersionList[++policyVerIndexAt])){
				nextEl.addClass('active');
			}else{
				nextEl.removeClass('active');
			}
		},

		/** on close */
		onClose: function() {}
	});

	return RangerPolicyRO;
});
