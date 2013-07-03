(function(window) {

  'use strict';

  var Babu = function() {

    var _this = this;

    var WORKER_PATH = 'js/recorderWorker.js';
    var worker = null;
    // Audio nodes and settings
    var audioContext = null;
    var audioInput = null;
    var inputPoint = null;
    var bufferSource = null;
    var bufferLen = 4096;
    var recording = false;
    var recIndex = 0;
    var currCallback = null;

    this.play = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({
        command: 'getBuffers'
      });
    }

    this.upload = function() {
      console.log('Uploading');
      _this.exportWAV(_this.doneEncoding, null, 'upload');
    }

    this.download = function() {
      _this.exportWAV(_this.doneEncoding, null, 'download');
    }

    this.playAudio = function() {
      console.log('Playing');
      _this.play(_this.setBuffers);
    }

    this.stopAudio = function() {
      console.log('Stopping');
      bufferSource.stop(0);
    }

    this.setBuffers = function(buffers) {
      bufferSource = audioContext.createBufferSource();
      bufferSource.buffer = audioContext.createBuffer(1, buffers[0].length, 44100);
      bufferSource.buffer.getChannelData(0).set(buffers[0]);
      bufferSource.buffer.getChannelData(0).set(buffers[1]);
      // Pipe buffer data into audio destination (speakers)
      bufferSource.connect(audioContext.destination);
      bufferSource.start(0);
    }

    this.startWorker = function() {
      worker = new Worker(WORKER_PATH);
      worker.onmessage = function(e) {
        var blob = e.data;
        currCallback(blob);
      }
      worker.postMessage({
        command: 'init',
          config: {
            sampleRate: audioContext.sampleRate,
            uploadUrl: 'http://localhost/babu/test.php',
          }
      });
    }

    this.exportWAV = function(cb, type, action) {
      console.log("exporting WAV");
      currCallback = cb;
      type = type || 'audio/wav';
      if (!currCallback)
          throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type,
        action: action,
      });
    }

    // Callback function for exportWAV
    this.doneEncoding = function(blob) {
      var filename = "myRecording" + ((recIndex < 10) ? "0" : "") + recIndex + ".wav";
      var url = (window.URL || window.webkitURL).createObjectURL(blob);
      var link = window.document.createElement('a');
      link.href = url;
      link.download = filename || 'output.wav';
      var click = document.createEvent("Event");
      click.initEvent("click", true, true);
      link.dispatchEvent(click);
      recIndex++;
    }

    this.startRecording = function() {
      console.log('Start Record');
      worker.postMessage({
        command: 'clear'
      });
      recording = true;
    }

    this.stopRecording = function() {
      console.log('Stop Record');
      recording = false;
    }

    this.startAudioListener = function() {
      // Creating script processor node
      _this.node = audioContext.createJavaScriptNode(bufferLen, 2, 2);
      _this.node.onaudioprocess = function(e) {
        if (!recording) 
          return;
        console.log("recording");
        worker.postMessage({
          command: 'record',
          buffer: [
            e.inputBuffer.getChannelData(0),
            e.inputBuffer.getChannelData(1)
          ]
        });
      };
      // Pipe the first gain node to recorder
      inputPoint.connect(_this.node);
      // Pipe recorder output to audio destination
      _this.node.connect(audioContext.destination);
    }

    this.connectStream = function(stream) {
      // Set up audio context
      audioContext = new webkitAudioContext();
      // Create first connecting node
      inputPoint = audioContext.createGainNode();
      // Create node representing souce of audio (mic)
      audioInput = audioContext.createMediaStreamSource(stream);
      // Pipe audio stream output into first gain
      audioInput.connect(inputPoint);
      // Create a web worker that contains implementation of buffer manipulation and WAV encoding
      _this.startWorker();
      _this.startAudioListener();
    }

    this.init = function() {
      if (!navigator.webkitGetUserMedia)
        return (alert("Error: getUserMedia not supported!"));

      navigator.webkitGetUserMedia({
        audio: true
      }, _this.connectStream, function(e) {
        alert('Error getting audio');
        console.log(e);
      });
    }

  }
  window.Babu = Babu;
})(window);
