var audioContext = new webkitAudioContext();
var audioInput = null,
  realAudioInput = null,
  inputPoint = null,
  audioRecorder = null,
  bufferSrc = null;
var rafID = null;
// Identifier for each recording
var recIndex = 0;

function upload() {
  console.log('Uploading');
  audioRecorder.exportWAV(doneEncoding, null, 'upload');
}

function download() {
  audioRecorder.exportWAV(doneEncoding, null, 'download');
}

function playAudio() {
  console.log('Playing');
  audioRecorder.play(setBuffers);
}

function stopAudio() {
  console.log('Stopping');
  bufferSrc.stop(0);
}

// Callback function for exportWAV

function doneEncoding(blob) {
  Recorder.forceDownload(blob, "myRecording" + ((recIndex < 10) ? "0" : "") + recIndex + ".wav");
  recIndex++;
}

function setBuffers(buffers) {
  bufferSrc = audioContext.createBufferSource();
  bufferSrc.buffer = audioContext.createBuffer(1, buffers[0].length, 44100);
  bufferSrc.buffer.getChannelData(0).set(buffers[0]);
  bufferSrc.buffer.getChannelData(0).set(buffers[1]);
  // Pipe buffer data into audio destination (speakers)
  bufferSrc.connect(audioContext.destination);
  bufferSrc.start(0);
}

function startRecording() {
  console.log('Start Record');
  if (!audioRecorder)
    return;
  audioRecorder.clear();
  audioRecorder.record();
}

function stopRecording() {
  console.log('Stop Record');
  audioRecorder.stop();
}

function gotStream(stream) {
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
  audioRecorder = new Recorder(inputPoint);
}

function initAudio() {
  if (!navigator.webkitGetUserMedia)
    return (alert("Error: getUserMedia not supported!"));

  navigator.webkitGetUserMedia({
    audio: true
  }, gotStream, function (e) {
    alert('Error getting audio');
    console.log(e);
  });
}

window.addEventListener('load', initAudio);