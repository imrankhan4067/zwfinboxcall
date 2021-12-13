sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	return Controller.extend("zuserdetails.controller.View1", {
		
		onInit: function () {
			// get task data
			var startupParameters = this.getComponentData().startupParameters;
			var taskModel = startupParameters.taskModel;
			var taskData = taskModel.getData();
			var taskId = taskData.InstanceID;
			var processContext = new sap.ui.model.json.JSONModel();

			var that = this;
			var jsonModel = new sap.ui.model.json.JSONModel();
			that.setModel(jsonModel);

			$.ajax({
				type: "GET",
				url: "/bpmworkflowruntime/rest/v1/task-instances/" + taskId + "/context",
				contentType: "application/json",
				dataType: "json",
				success: function(result, xhr, data) {

					var processContext = new sap.ui.model.json.JSONModel();
					processContext.context = data.responseJSON;

					processContext.context.task = {};
					processContext.context.task.Title = taskData.TaskTitle;
					processContext.context.task.Priority = taskData.Priority;
					processContext.context.task.Status = taskData.Status;

					if (taskData.Priority === "HIGH") {
						processContext.context.task.PriorityState = "Warning";
					} else if (taskData.Priority === "VERY HIGH") {
						processContext.context.task.PriorityState = "Error";
					} else {
						processContext.context.task.PriorityState = "Success";
					}

					processContext.context.task.CreatedOn = taskData.CreatedOn.toDateString();
					// get task description and add it to the model
					startupParameters.inboxAPI.getDescription("NA", taskData.InstanceID).done(function(dataDescr) {
						processContext.context.task.Description = dataDescr.Description;
						jsonModel.setProperty("/context/task/Description", dataDescr.Description);
					}).
					fail(function(errorText) {
						jQuery.sap.require("sap.m.MessageBox");
						sap.m.MessageBox.error(errorText, {
							title: "Error"
						});
					});
					jsonModel.setData(processContext);
					that.setModel(jsonModel);
				}
			});
			startupParameters.inboxAPI.addAction({
					action: "Approve",
					label: "Approve"
				}, function(button) {
					this._completeTask(taskId, true);
				},
				this);
			startupParameters.inboxAPI.addAction({
				action: "Reject",
				label: "Reject"
			}, function(button) {
				var email = jsonModel.getProperty("/context/userData/email");
				jsonModel.setProperty("/context/userData/Rejected", "X");
				sap.m.URLHelper.triggerEmail(email, "Request to create userid rejected",
					"Request to create userid has been rejected. Please contact helpdesk.");
				this._completeTask(taskId, false);
			}, this); 
		},
	_completeTask: function(taskId, approvalStatus) {
			var token = this._fetchToken();
			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/task-instances/" + taskId,
				method: "PATCH",
				contentType: "application/json",
				async: false,
				data: "{\"status\": \"COMPLETED\", \"context\": {\"approved\":\"" + approvalStatus + "\"}}",
				headers: {
					"X-CSRF-Token": token
				}
			});
			this._refreshTask(taskId);
		},
		_fetchToken: function() {
			var token;
			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/xsrf-token",
				method: "GET",
				async: false,
				headers: {
					"X-CSRF-Token": "Fetch"
				},
				success: function(result, xhr, data) {
					token = data.getResponseHeader("X-CSRF-Token");
				}
			});
			return token;
		},
		_refreshTask: function(taskId) {
			this.getComponentData().startupParameters.inboxAPI.updateTask("NA", taskId);
		}		
		
	});

});