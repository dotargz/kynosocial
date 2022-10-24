function getFile() {
  document.querySelector('input[type="file"]').click();
}

function sub(obj) {
  var file = obj.value;
  var fileName = file.split("\\");
  document.querySelector('span.btn').innerHTML = fileName[fileName.length - 1];
  event.preventDefault();
}

function nav() {
  const params = new URLSearchParams(window.location.search)
  const page = params.get('page')
  if (page && page !== 'home') {
    const e = document.querySelector(`a[href="?page=${page}"]`)
    e.setAttribute('aria-current', page.split('=')[1])
  } else {
    const e = document.querySelector(`a[href="/"]`)
    e.setAttribute('aria-current', 'recent')
  }
}

nav()