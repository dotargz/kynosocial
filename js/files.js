function getFile() {
  document.querySelector('input[type="file"]').click();
}

function sub(obj) {
  var file = obj.value;
  var fileName = file.split("\\");
  document.querySelector('span.btn').innerHTML = fileName[fileName.length - 1];
  event.preventDefault();
}