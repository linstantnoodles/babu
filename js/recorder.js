(function(window){

  var WORKER_PATH = 'js/recorderWorker.js';

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    var worker = new Worker(config.workerPath || WORKER_PATH);
    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate,
        uploadUrl: 'http://localhost/babu/test.php',
      }
    });

    var recording = false,
      currCallback;

    this.node.onaudioprocess = function(e){
      if (!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: [
          e.inputBuffer.getChannelData(0),
          e.inputBuffer.getChannelData(1)
        ]
      });
    }

    this.record = function(){
      recording = true;
    }

    this.stop = function(){
      recording = false;
    }

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
    }

    this.play = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffers' })
    }

    this.getBuffers = function(cb) {
      currCallback = cb || config.callback;
      // Worker gets buffer data and post message back to parent
      worker.postMessage({ command: 'getBuffers' })
    }

    this.exportWAV = function(cb, type, action){
      console.log("exporting WAV");
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type,
        action: action,
      });
    }

    worker.onmessage = function(e){
      var blob = e.data;
      currCallback(blob);
    }
    // Pipe the first gain node to recorder
    source.connect(this.node);
    // Pipe recorder output to audio destination
    this.node.connect(this.context.destination);    //this should not be necessary
  };

  Recorder.forceDownload = function(blob, filename){
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = window.document.createElement('a');
    link.href = url;
    link.download = filename || 'output.wav';
    var click = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
  }

  window.Recorder = Recorder;

})(window);
