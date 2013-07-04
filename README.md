#Babu
A dead simple HTML5 Audio Recording Library using [Web Audio API](http://www.html5rocks.com/en/tutorials/webaudio/intro/)

####Initialize

#####In HTML

```html
<a id="start-record" href="#">Start Recording</a>
```

#####In JavaScript

```javascript
var config = {
  workerPath: 'js/babuWorker.js',
  uploadUrl: 'http://localhost/babu/test.php',
}
var babu = new Babu();

$("#start-record").click(function() {
  babu.startRecording();
});
```
#####Supported Functions

* Start recording - startRecording()
* Stop recording - stopRecording()
* Play recorded audio - playAudio()
* Stop playing recorded audio - stopAudio()
* Download Audio - download()
* Upload Audio - upload()

#License
Freely distributable
