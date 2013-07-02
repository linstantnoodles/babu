(function(window) {

  'use strict';

  var Babu = function() {

    var WORKER_PATH = 'js/recorderWorker.js',
      audioContext = new webkitAudioContext(),
      audioInput = null,
      realAudioInput = null,
      inputPoint = null,
      audioRecorder = null,
      bufferSrc = null,
      rafID = null,
      recIndex = 0,
      bufferLen = 4096,
      recording = false,
      worker = new Worker(WORKER_PATH),
      self = this,
      currCallback = null;

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
      bufferSrc.stop(0);
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
      bufferSrc = audioContext.createBufferSource();
      bufferSrc.buffer = audioContext.createBuffer(1, buffers[0].length, 44100);
      bufferSrc.buffer.getChannelData(0).set(buffers[0]);
      bufferSrc.buffer.getChannelData(0).set(buffers[1]);
      // Pipe buffer data into audio destination (speakers)
      bufferSrc.connect(audioContext.destination);
      bufferSrc.start(0);
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
      // Create buffer source for playback
      bufferSrc = audioContext.createBufferSource();
      // Pipe audio stream output into first gain
      audioInput.connect(inputPoint);
      // Pipe buffer data into audio destination (speakers)
      bufferSrc.connect(audioContext.destination);
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
