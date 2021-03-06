"use strict";
console.log('loading controllers');
angular.module('CKConsoleViewerApp.controllers', []).
	controller('navigationController', function($scope, $modal, $log){
		$scope.openAbout = function (size) {
			var modalInstance = $modal.open({
				templateUrl: 'aboutModal.html',
				controller: 'ModalInstanceController',
				size: size
			});

			modalInstance.result.then(function () {}, function () {
				$log.info('Modal dismissed at: ' + new Date());
			});
		};
		$scope.openHelp = function (size) {
			var modalInstance = $modal.open({
				templateUrl: 'helpModal.html',
				controller: 'ModalInstanceController',
				size: size
			});

			modalInstance.result.then(function () {}, function () {
				$log.info('Modal dismissed at: ' + new Date());
			});
		};
	}).
	controller('ModalInstanceController', function($scope, $modalInstance){
		$scope.ok = function () {
			$modalInstance.close();
		};

		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		};

	}).
	controller('groupsListController', function($scope, GroupListService){

		$scope.dataList = GroupListService.groupList;
		$scope.recorders = GroupListService.recorders;

		$scope.ignoreNullComparator = function(actual, expected){
			if (expected === null) {
				return true;
			} else {
				return angular.equals(expected, actual);
			}
		};

		$scope.hasMediaSelection = [
			'True',
			'False'
		];
	}).



	controller('dataDisplayController', function($scope, $routeParams, ckConsole){
		var groupName = $routeParams.group;

		$scope.progressPercent = 10;


		function Data(id, birthCert, data, mediaList){
			function ImageURLData(id, imageDataSet){
				this.id = id;
				this.thumb = imageDataSet.thumb;
				this.small = imageDataSet.small;
				this.medium = imageDataSet.medium;
				this.original = imageDataSet.original;
			}

			this.id = id;
			this.birthCert = birthCert;
			this.data = data;
			this.dataHeaders = [];
			this.mediaList = [];
			for(var d in data){
				this.dataHeaders[this.dataHeaders.length] = d;
			}
			if(mediaList == null){
				this.hasMedia = false;
				return;
			}

			if($scope.mediaSizeMax < Object.keys(mediaList).length){
				$scope.mediaSizeMax = Object.keys(mediaList).length;
			}
			this.hasMedia = true;
			for(var mediaName in mediaList){
				this.mediaList[this.mediaList.length] = new ImageURLData(mediaName, mediaList[mediaName]);
			}

		}

		$scope.dataName = groupName;
		$scope.dataList = [];
		$scope.mediaSizeMax = 0;
		ckConsole.getGroup(groupName).then(function(infoData){
			$scope.progressPercent = 30;
			$scope.$apply;
			var completePercent = 80;
			var step = ((completePercent - $scope.progressPercent) / Object.keys(infoData.members).length);

			console.log(infoData);
			$scope.dataHeaders = [];
			for(var id in infoData.members){
				$scope.progressPercent += step;
				var member = infoData.members[id];
				var images = null;
				try{
					images = member.media.images;
				} catch (e){
				}
				var memberData = new Data(id, member.birth_certificate, member.data, images);
				$scope.dataList[$scope.dataList.length] = memberData;
				//Find the longest header
				$scope.dataHeaders = _.uniq($scope.dataHeaders.concat(memberData.dataHeaders));
				//$scope.dataHeaders = memberData.dataHeaders;
			}

			console.log($scope.dataList);
			$scope.$apply;


			var maxIterateSize = 100;
			var iterateSize = ($scope.dataList.length < maxIterateSize ? $scope.dataList.length : maxIterateSize);
			//Check to see if its worth it to create a dropdown for a header
			var tableValuesForHeader = {};
			$scope.tableValuesForHeader = tableValuesForHeader;
			for(var j in $scope.dataHeaders){
				var header = $scope.dataHeaders[j];
				var valuesChecked = 0;
				tableValuesForHeader[header] = {
					duplicateFound: false, // Should this field have a dropdown?
					values : [], // List of values for a given row
					valuesWithCount: {},
					selectedValues : [],
					dropDownOpen: false,
					toggleDropDown: function(){
						//Store what the value was
						var valueWas = this.dropDownOpen;
						//Close all of the other drop downs
						for(var otherHeader in $scope.tableValuesForHeader){
							$scope.tableValuesForHeader[otherHeader].dropDownOpen = false;
						}
						//Toggle this one
						this.dropDownOpen = !valueWas;
					},
					checkAll : function(){
						this.dropDownOpen = true;
						this.selectedValues = this.values;
					},
					setSelected : function(value){
						this.dropDownOpen = true;
						console.log("setSelected called with:");
						console.log(value);
						if (_.contains(this.selectedValues, value)) {
							this.selectedValues = _.without(this.selectedValues, value);
						} else {
							this.selectedValues.push(value);
						}
						return false;
					},
					isChecked : function(value){
						if (_.contains(this.selectedValues, value)) {
							return 'glyphicon glyphicon-ok pull-right';
						}
						return 'glyphicon glyphicon-ok pull-right hide';
					}
				};
				for(var i = 0; i < (tableValuesForHeader[header].duplicateFound ? $scope.dataList.length : iterateSize); i++){
					var data = $scope.dataList[i].data;
					if(data[header] == ""){
						//If the field is undefined then skip it but search one space further
						iterateSize = (iterateSize + 1 > $scope.dataList.length ? $scope.dataList.length : iterateSize + 1);
						continue;
					}
					if(tableValuesForHeader[header].values.indexOf(data[header]) == -1){
						tableValuesForHeader[header].values.push(data[header]);
						tableValuesForHeader[header].valuesWithCount[data[header]] = 1;
					} else {
						tableValuesForHeader[header].duplicateFound = true;
						tableValuesForHeader[header].valuesWithCount[data[header]] ++;
					}
				}
			}
			console.log(tableValuesForHeader);
			$scope.progressPercent = 100;

			$scope.totalDisplayed = ($scope.dataList.length < 500 ? $scope.dataList.length : 500);
		});

		$scope.filtered = null;
		$scope.excludeText = "";
		$scope.loadMore = function () {
			$scope.totalDisplayed += 500;
		};

		$scope.uncheckAll = function() {
			angular.forEach($scope.tableValuesForHeader, function(headerData){
				headerData.selectedValues = [];
			});
		}

		$scope.filtersAdditiveSelection = [false, true];
		$scope.filtersAdditive = false;


	}).


	filter('columnFilter', function(){
		return function(elements, allheaderData){
			if (!angular.isUndefined(elements) && !angular.isUndefined(allheaderData) && _.flatten(_.pluck(allheaderData, 'selectedValues')).length > 0){
				var tempElements = [];
				angular.forEach(allheaderData, function(headerData, header){
					angular.forEach(headerData.selectedValues, function(selectedValue){
						angular.forEach(elements, function(element){
							if(angular.equals(element.data[header], selectedValue) && !_.contains(tempElements, element)){
								tempElements.push(element);
							}
						});
					});
				});
				return tempElements;
			} else {
				return elements;
			}
		}
	}).


	filter('range', function() {
		return function(input, total) {
			total = parseInt(total);
			for (var i=0; i<total; i++)
				input.push(i);
			return input;
		};
	});
