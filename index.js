(function() {

    var index = angular.module('app.index', ['angularFileUpload']);

    index.controller('indexController', function($scope, $http, $timeout, $upload, pacmanFactory) {

        var state = $('#state'); //todo: should be init from a view
        var pacman = undefined; //lazy initialization couse pacman loaded as partial

        initView();

        $scope.onFileSelectEq = function($files) {
            $scope.eqFile = $files[0];
        };

        $scope.onFileSelectNvkd = function($files) {
            $scope.nvkdFile = $files[0];
        };

        $scope.onFileSelectMan = function ($files) {
            $scope.manFile = $files[0];
        };

        $scope.onFileSelectDbf = function($files) {
            $scope.dbfFile = $files[0];
        };

        $scope.onFileSelectCsv = function ($files) {
            $scope.csvFile = $files[0];
        };

        $scope.onFileSelectEqRevice = function ($files) {
            $scope.eqFile = $files[0];
        };

        $scope.onFileSelectCsvRevice = function ($files) {
            $scope.csvFile = $files[0];
        };

        $scope.doRevice = function () {

            if (!validateFilesRevice()) {
                return;
            }

            $(".state").show();
            $(".reportTable").hide();

            if (pacman === undefined) pacman = new pacmanFactory('pacman');

            beforeUpload();

            $scope.fileUploadObj = { connId: $('#connectId').text()};

            $upload.upload({
                url: "./api/revice/upload", // webapi url
                method: "POST",
                data: { fileUploadObj: $scope.fileUploadObj },
                file: [$scope.eqFile, $scope.csvFile]
            }).progress(function (evt) {
                // get upload percentage
                console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
            }).success(onSuccessRevice).error(onError);

        };

        $scope.showTable = function() {
            doUpload(false, onSuccess);
        };

        $scope.generateTransactions = function () {
            doUpload(true, onSuccess2);
        };

        function doUpload(genTran, onSuccessUpload) {
            if (!validateFiles()) {
                return;
            }

            $(".state").show();
            $(".reportTable").hide();

            if (pacman === undefined) pacman = new pacmanFactory('pacman');

            beforeUpload();

            var manualEqRep = $scope.manFile != null;
            var csvRep = $scope.csvFile != null;


            $scope.fileUploadObj = { eqFile: true, nvkdFile: true, connId: $('#connectId').text(), generateTransactions: genTran, uploadManualEq: manualEqRep, uploadCsv: csvRep};

            
            var files;
            if ($scope.csvFile == null) {
                if ($scope.manFile == null) {
                    files = [$scope.eqFile, $scope.nvkdFile, $scope.dbfFile];
                } else {
                    files = [$scope.eqFile, $scope.nvkdFile, $scope.dbfFile, $scope.manFile];
                }
            } else {
                if ($scope.manFile == null) {
                    files = [$scope.eqFile, $scope.nvkdFile, $scope.dbfFile, $scope.csvFile];
                } else {
                    files = [$scope.eqFile, $scope.nvkdFile, $scope.dbfFile, $scope.manFile, $scope.csvFile];
                }

            }
            $upload.upload({
                url: "./api/process/upload", // webapi url
                method: "POST",
                data: { fileUploadObj: $scope.fileUploadObj },
                file: files
            }).progress(function (evt) {
                // get upload percentage
                console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
            }).success(onSuccessUpload).error(onError);
        }

        function beforeUpload() {
            pacman.show();
            state.css('color', 'orange');
            disableElements();
            setStatusText("Начало обработки");
            pacman.movePacMan();
        }

        function afterUpload() {
            enableElements();
            pacman.hide();
            pacman.resetPacman();
        }

        function onError(data) {
            console.log(data);
            setStatusText(data.Message);
            setStatusColor("red");
            afterUpload();
        }

        function onSuccess(data) {
            $scope.finalReport = data;
            setStatusText("");
            showReportTable(data);
            afterUpload();
        }

        function onSuccessRevice(data) {
            $scope.finalReport = data;
            setStatusText("");
            showReviceTable(data);
            afterUpload();
        }

        function onSuccess2(data) {
            setStatusText("");
            if (data.dbfFileLink.length == 3) {
                showDownloadLink(data.dbfFileLink[0]);
                showSpodDownloadLink(data.dbfFileLink[1]);
                showCsvDownloadLink(data.dbfFileLink[2]);
            } else {
                showDownloadLink(data.dbfFileLink[0]);
                showCsvDownloadLink(data.dbfFileLink[1]);
            }
            afterUpload();
        }

        function showReportTable(data) {
            $(".state").hide();
            $(".reportTable").show();

            $("#reportTab").remove();

            $('<table>', {
                id: 'reportTab'
            }).appendTo('.reportTable');

            $("#reportTab").append('<th>№</th><th>Элемент резервирования</th><th>Расчетное значение EQ</th><th>Остаток по счету на утро</th><th>Общая задолженность</th><th>Расчетное значение</th><th>Сумма корректировки</th><th>Комментарий</th>');

            data.Portfolios.forEach(addPortfolio);
           
            rowNum = 0;
        }

        function showReviceTable(data) {
            $(".state").hide();
            $(".reportTable").show();

            $("#reportTab").remove();

            $('<table>', {
                id: 'reportTab'
            }).appendTo('.reportTable');

            $("#reportTab").append('<th>№</th><th>Элемент резервирования + портфель</th><th>Исх. остат.  EQ</th><th>Расчетное значение</th><th>Разница</th>');

            data.Items.forEach(addReviceResult);

            rowNum = 0;
        }

        function addReviceResult(item) {

            if (item.Comments == null) {
                item.Comments = "";
            }
            rowNum++;
            $("#reportTab").append('<tr><td>' + rowNum + '</td>' +
                '<td>' + item.Element + '</td>' +
                '<td>' + item.RestEq + '</td>' +
                '<td>' + item.RestCalc + '</td>' +
                '<td>' + item.Diff + '</td></tr>');
        }

        function addPortfolio(item) {
            $("#reportTab").append('<tr><td id="port" colspan = "5">' + item.Description  + '</td></tr>');
            if (item.Comments != null) {
                $("#reportTab").append('<tr><td id="warn" colspan = "5">'  + item.Comments + '</td></tr>');
            }
            item.Adjustments.forEach(addReserve);
        }

        var rowNum = 0;

        function addReserve(item) {

            if (item.Comments == null) {
                item.Comments = "";
            }
            rowNum++;
            $("#reportTab").append('<tr><td>' + rowNum + '</td>' +
                '<td>' + item.Description + '</td>' +
                '<td>' + item.SumToReserve.toString().replace(/(\d{1,3}(?=(\d{3})+(?:\.\d|\b)))/g, "\$1 ") + '</td>' + 
                '<td>' + item.AccountRestCurrent.toString().replace(/(\d{1,3}(?=(\d{3})+(?:\.\d|\b)))/g, "\$1 ") + '</td>' +
                '<td>' + item.DebtSumFinal.toString().replace(/(\d{1,3}(?=(\d{3})+(?:\.\d|\b)))/g, "\$1 ") + '</td>' +
                '<td>' + item.SumToReserveFinal.toString().replace(/(\d{1,3}(?=(\d{3})+(?:\.\d|\b)))/g, "\$1 ") + '</td>' +
                '<td>' + item.AdjustmentSumFinal.toString().replace(/(\d{1,3}(?=(\d{3})+(?:\.\d|\b)))/g, "\$1 ") + '</td>' +
                '<td>' + item.Comments + '</td></tr>');
        }

        function initView() {
            $scope.customStyle = {};
            $scope.isInputEnabled = false;
            $(".reportTable").hide();
            setStatusColor("orange");
            setStatusText("Идет подключение, подождите пожалуйста!");
        }

        function setStatusText(status) {
            state.text(status);
        };

        function disableElements() {
            $scope.isInputDisabled = true;
        };

        function enableElements() {
            $scope.isInputDisabled = false;
        };

        function setStatusColor(color) {
            $scope.customStyle.style = { "color": color };
        };

        function showDownloadLink(url) {
            $('<a>', {
                text: 'Скачать проводки',
                title: 'Скачать dbf файл с проводками',
                id: 'downloaddbf',
                href: url
            }).appendTo('#state');
        }

        function showSpodDownloadLink(url) {
            $('<a>', {
                text: 'Скачать проводки СПОД',
                title: 'Скачать dbf файл с проводками по СПОД',
                id: 'downloaddbf',
                href: url
            }).appendTo('#state');
        }

        function showCsvDownloadLink(url) {
            $('<a>', {
                text: 'Скачать корректировку',
                title: 'Скачать файл корректировки',
                id: 'downloadcsv',
                href: url
            }).appendTo('#state');
        }

        function validateFiles() {
            $scope.customStyleEq = {};
            $scope.customStyleNvkd = {};
            $scope.customStyleDbf = {};

            var resultStr = "Нет файлов:";
            var err = false;

            if ($scope.eqFile == null) {
                resultStr = resultStr + " EQ,";
                $scope.customStyleEq.style = { "border-color": "red" };
                err = true;
            }

            if ($scope.nvkdFile == null) {
                resultStr = resultStr + " НВКД,";
                $scope.customStyleNvkd.style = { "border-color": "red" };
                err = true;
            }

            if ($scope.dbfFile == null) {
                resultStr = resultStr + " DBF,";
                $scope.customStyleDbf.style = { "border-color": "red" };
                err = true;
            }

            if (err) {
                setStatusColor("red");
                setStatusText(resultStr.substring(0, resultStr.length - 1));
                return false;
            }

            return true;
        }

        function validateFilesRevice() {
            $scope.customStyleEq = {};
            $scope.customStyleCsv = {};

            var resultStr = "Нет файлов:";
            var err = false;

            if ($scope.eqFile == null) {
                resultStr = resultStr + " EQ,";
                $scope.customStyleEq.style = { "border-color": "red" };
                err = true;
            }

            if ($scope.csvFile == null) {
                resultStr = resultStr + " CSV,";
                $scope.customStyleCsv.style = { "border-color": "red" };
                err = true;
            }

            if (err) {
                setStatusColor("red");
                setStatusText(resultStr.substring(0, resultStr.length - 1));
                return false;
            }

            return true;
        }
    });
})()

//Закомментил для примера, может пригодится потом

//$('#logo').hover(
//       function () {
//           $(this).animate({ borderSpacing: 180 }, {
//               step: function (now, fx) {
//                   $(this).css('-webkit-transform', 'rotate(' + now + 'deg)');
//                   $(this).css('-moz-transform', 'rotate(' + now + 'deg)');
//                   $(this).css('-ms-transform', 'rotate(' + now + 'deg)');
//                   $(this).css('-o-transform', 'rotate(' + now + 'deg)');
//                   $(this).css('transform', 'rotate(' + now + 'deg)');
//               },
//               duration: 'slow'
//           }, 'linear')
//       }
//       ,
//       function () {
//           $(this).animate({ borderSpacing: 0 }, {
//               step: function (now, fx) {
//                   $(this).css('-webkit-transform', 'rotate(' + now + 'deg)');
//                   $(this).css('-moz-transform', 'rotate(' + now + 'deg)');
//                   $(this).css('-ms-transform', 'rotate(' + now + 'deg)');
//                   $(this).css('-o-transform', 'rotate(' + now + 'deg)');
//                   $(this).css('transform', 'rotate(' + now + 'deg)');
//               },
//               duration: 'slow'
//           }, 'linear')
//       });
        

