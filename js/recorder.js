(function(window) {

  var WORKER_PATH = 'js/recorderWorker.js',
    audioContext = new webkitAudioContext(),
    audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null,
    bufferSrc = null,
    rafID = null,
    recIndex = 0,
    recording = false;

  var Babu = function() {
    var worker = new Worker(WORKER_PATH);

    var self = this;
    var currCallback = null;

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
      console.log("export wav");
      console.log(this);
      console.log("exporting WAV");
      currCallback = cb;
      console.log(cb);
      type = type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type,
        action: action,
      });
    }

    worker.onmessage = function(e) {
      console.log("Worker");
      console.log(this);
      var blob = e.data;
      currCallback(blob);
    }

    this.force = function(blob, filename) {
      var url = (window.URL || window.webkitURL).createObjectURL(blob);
      var link = window.document.createElement('a');
      link.href = url;
      link.download = filename || 'output.wav';
      var click = document.createEvent("Event");
      click.initEvent("click", true, true);
      link.dispatchEvent(click);
    }

    this.upload = function() {
      console.log('Uploading');
      this.exportWAV(this.doneEncoding, null, 'upload');
    }

    this.download = function() {
      console.log(this);
      this.exportWAV(this.doneEncoding, null, 'download');
    }

    this.playAudio = function() {
      console.log('Playing');
      console.log(this);
      this.play(this.setBuffers);
    }

    this.stopAudio = function() {
      console.log('Stopping');
      bufferSrc.stop(0);
    }

    this.test = function() {
      alert("WOW");
    }
    // Callback function for exportWAV
    this.doneEncoding = function(blob) {
      var filename = "myRecording" + ((recIndex < 10) ? "0" : "") + recIndex + ".wav";
      self.force(blob, filename);
      recIndex++;
    }

    this.setBuffers = function(buffers) {
      console.log(this);
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
      // Connects gain node to recorder
      var bufferLen = 4096;
      //creating script processor node
      this.node = audioContext.createJavaScriptNode(bufferLen, 2, 2);
      //create a web worker that contains implementation of buffer manipulation and WAV encoding
      worker.postMessage({
        command: 'init',
        config: {
          sampleRate: audioContext.sampleRate,
          uploadUrl: 'http://localhost/babu/test.php',
        }
      });

      this.node.onaudioprocess = function(e) {
        //this event is dispatched by the one in main
        if (!recording) return;
        console.log("record");
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
      this.node.connect(audioContext.destination); //this should not be necessary
      zeroGain = audioContext.createGainNode();
      zeroGain.gain.value = 0.0;
      inputPoint.connect(zeroGain);
      zeroGain.connect(audioContext.destination);
    }

    //gets called
    this.initAudio = function() {
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
