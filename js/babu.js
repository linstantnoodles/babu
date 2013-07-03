(function(window) {

  'use strict';

  var Babu = function() {
    // in here we hae a worker
    // we have audio context settings
    // set event handler for audio processing
    var WORKER_PATH = 'js/recorderWorker.js';
    var audioContext = new webkitAudioContext();
    var audioInput = null;
    var inputPoint = null;
    var bufferSource = null;
    var bufferLen = 4096;
    var recording = false;
    var worker = new Worker(WORKER_PATH);
    var currCallback = null;
    var recIndex = 0;

    this.play = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({
        command: 'getBuffers'
      });
    }

    this.getBuffers = function(cb) {
      currCallback = cb || config.callback;
      // Worker gets buffer data and post message back to parent
      worker.postMessage({
        command: 'getBuffers'
      });
    }

    this.exportWAV = function(cb, type, action) {
      console.log("exporting WAV");
      currCallback = cb;
      type = type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type,
        action: action,
      });
    }

    worker.onmessage = function(e) {
      var blob = e.data;
      currCallback(blob);
    }

    this.upload = function() {
      console.log('Uploading');
      this.exportWAV(this.doneEncoding, null, 'upload');
    }

    this.download = function() {
      this.exportWAV(this.doneEncoding, null, 'download');
    }

    this.playAudio = function() {
      console.log('Playing');
      this.play(this.setBuffers);
    }

    this.stopAudio = function() {
      console.log('Stopping');
      bufferSource.stop(0);
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

    this.setBuffers = function(buffers) {
      bufferSource = audioContext.createBufferSource();
      bufferSource.buffer = audioContext.createBuffer(1, buffers[0].length, 44100);
      bufferSource.buffer.getChannelData(0).set(buffers[0]);
      bufferSource.buffer.getChannelData(0).set(buffers[1]);
      // Pipe buffer data into audio destination (speakers)
      bufferSource.connect(audioContext.destination);
      bufferSource.start(0);
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

    this.gotStream = function(stream) {
      // Create first connecting node
      inputPoint = audioContext.createGainNode();
      // Create node representing souce of audio (mic)
      audioInput = audioContext.createMediaStreamSource(stream);
      // Pipe audio stream output into first gain
      audioInput.connect(inputPoint);
      // Creating script processor node
      this.node = audioContext.createJavaScriptNode(bufferLen, 2, 2);
      // Create a web worker that contains implementation of buffer manipulation and WAV encoding
      worker.postMessage({
        command: 'init',
        config: {
          sampleRate: audioContext.sampleRate,
          uploadUrl: 'http://localhost/babu/test.php',
        }
      });

      // Listen for record event
      this.node.onaudioprocess = function(e) {
        if (!recording) return;
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
      inputPoint.connect(this.node);
      // Pipe recorder output to audio destination
      this.node.connect(audioContext.destination);
    }

    this.init = function() {
      if (!navigator.webkitGetUserMedia)
        return (alert("Error: getUserMedia not supported!"));
      navigator.webkitGetUserMedia({
        audio: true
      }, this.gotStream, function(e) {
        alert('Error getting audio');
        console.log(e);
      });
    }

  }
  window.Babu = Babu;
})(window);
