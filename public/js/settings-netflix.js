async function importNetflixHistory() {
    var input = document.getElementById('netflixfile');
    var filedata = new FormData();
    filedata.append('netflixviewactivity', input.files[0]);
    await createloader(document.getElementById('netflixtbody'), 'netflix');
    await fetch('/settings/netflix', {
        method: 'POST',
        body: filedata
    })
    .then(response => {
        document.getElementById('netflixtbody').querySelector('div.spinner-border').parentElement.remove();
        if(!response.ok) {
            processError(response.status);
            return false;
        } else {
            return response.json();
        }
    })
    .then(data => {
        if(data != false) {
            processNetflixData(data)
        }
    })
    .catch(function(error) {
        console.error(error);
    });
}

async function searchTMDB(event) {
    event.preventDefault();
    var query = document.getElementById('searchtmdb').value;
    await createloader(document.getElementById('tmdbsearchresults'), 'tmdb');
    await fetch('/settings/netflix/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({
            'query': query
        })
    }).then(response => {
        document.getElementById('tmdbsearchresults').querySelector('div.spinner-border').remove();
        if(!response.ok) {
            processError(response.status);
            return false;
        } else {
            return response.json();
        }
    }).then(data => {
        processTMDBData(data);
    })
    .catch(function(error) {
        console.error(error);
    });
}

async function createloader(parent, target) {
    parent.innerHTML = '';
    let div = document.createElement('div');
    let span = document.createElement('span');
    div.className = 'spinner-border';
    span.className = 'visually-hidden';
    span.innerText = 'Loading...';
    div.append(span);
    if(target == 'netflix') {
        let row = document.createElement('tr');
        let cell = document.createElement('td');
        cell.colSpan = 4;
        cell.innerText = "";
        cell.append(div);
        row.append(cell);
        parent.append(row);
    } else if(target == 'tmdb') {
        parent.append(div);
    }
}

function updatetable() {
    let amount = document.getElementById('amounttoshow').value;
    let rows = document.getElementById('netflixtbody').children;
    let filter = document.getElementById('selectfilter').value;
    if(filter == 'notfound') {
        for(let i = 0; i < rows.length; i++) {
            if(rows[i].dataset.tmdbid != 'undefined') {
                rows[i].classList.add('d-none');
            } else {
                rows[i].classList.remove('d-none');
            }
        }
        document.querySelector('label[for="amounttoshow"]').classList.add('d-none');
        document.getElementById('amounttoshow').classList.add('d-none');
        createpagenav(amount, amount);
        changepage('all');
    } else {
        document.querySelector('label[for="amounttoshow"]').classList.remove('d-none');
        document.getElementById('amounttoshow').classList.remove('d-none');
        if(amount == 'all') {
            createpagenav(rows.length, rows.length);
        } else {
            createpagenav(amount, rows.length);
        }
        changepage(1);
    }
}

function changepage(direction) {
    let ul = document.getElementsByClassName('pagination')[0];
    let amount = document.getElementById('amounttoshow').value;
    let rows = document.getElementById('netflixtbody').children;
    let notfoundrows = document.querySelectorAll("tr[data-tmdbid='undefined']");
    var targetpage = -1;
    if(direction === 'previous') {
        if(!ul.children[1].classList.contains('active')) {
            document.getElementsByClassName('page-item active')[0].previousElementSibling.classList.add('active');
            document.getElementsByClassName('page-item active')[1].classList.remove('active');
            targetpage = parseInt(document.getElementsByClassName('page-item active')[0].innerText);
        }
    } else if(direction === 'next') {
        if(!ul.children[ul.childElementCount - 2].classList.contains('active')) {
            document.getElementsByClassName('page-item active')[0].nextElementSibling.classList.add('active');
            document.getElementsByClassName('page-item active')[0].classList.remove('active');
            targetpage = parseInt(document.getElementsByClassName('page-item active')[0].innerText);
        }
    } else if(!isNaN(parseInt(direction))) {
        document.getElementsByClassName('page-item active')[0].classList.remove('active');
        document.querySelectorAll('li.page-item:not(.active)').forEach((el) => {
            if(el.innerText == direction) {
                el.classList.add('active');
            }
        })
        targetpage = parseInt(direction);
    }

    if(targetpage != -1) {
        var filter = document.getElementById('selectfilter').value;
        let tbody = document.getElementById('netflixtbody');
        tbody.querySelectorAll("tr:not(.d-none)").forEach((el) => {
            el.classList.add('d-none');
        });
        if(amount == 'all') {
            for(let i = 0; i < rows.length; i++) {
                if(filter == 'notfound' && rows[i].dataset.tmdbid == 'undefined') {
                    rows[i].classList.remove('d-none');
                } else if(filter == 'all') {
                    rows[i].classList.remove('d-none');
                }
            }
        } else {
            for(let i = amount * targetpage - amount + 1; i < amount * targetpage + 1; i++) {
                if(rows.length > i && filter != 'notfound') {
                    rows[i].classList.remove('d-none');
                } else if(notfoundrows.length > i && filter == 'notfound') {
                    notfoundrows[i].classList.remove('d-none');
                }
            }
        }
    }
    window.scrollTo(0, 0);
}

function createpagenav(amount, items) {
    buttons_number = Math.ceil(items / amount);
    let ul = document.getElementsByClassName('pagination')[0];
    var lastchild = ul.children[ul.childElementCount - 1];

    // remove all children except the first ('previous' button) and the last ('next' button)
    while(ul.childElementCount > 2) {
        lastchild.previousElementSibling.remove();
    }

    // Create nav buttons
    for(let i = 0; i < buttons_number; i++) {
        let li = document.createElement('li');
        let link = document.createElement('a');
        li.style.cursor = 'pointer';
        li.className = i == 0 ? 'page-item active' : 'page-item';
        link.className = 'page-link';
        link.innerText = i + 1;
        li.append(link);
        // For some reason an event instantly runs if a parameter is passed directly to the callback function, so it has to be done this way
        li.addEventListener("click", () => { changepage(link.innerText); });
        lastchild.before(li);
    }

    if(ul.childElementCount == 3) {
        lastchild.classList.add('disabled');
        ul.children[0].classList.add('disabled');

        lastchild.style.cursor = 'not-allowed';
        ul.children[0].style.cursor = 'not-allowed';
    } else {
        lastchild.classList.remove('disabled');
        ul.children[0].classList.remove('disabled');

        lastchild.style.cursor = 'pointer';
        ul.children[0].style.cursor = 'pointer';
    }

    lastchild.addEventListener("click", () => { changepage('next'); });
    ul.children[0].addEventListener("click", () => { changepage('previous'); });
}

function processTMDBData(data) {
    let parent = document.getElementById('tmdbsearchresults');
    data.forEach((item) => {
        let media_div = document.createElement('div');
        let thumb_div = document.createElement('div');
        let descr_div = document.createElement('div');
        let radio_div = document.createElement('div');
        let heading = document.createElement('h3');
        let link = document.createElement('a');
        let img = document.createElement('img');
        let paragraph = document.createElement('p');
        let release_date = document.createElement('p');
        let radio = document.createElement('input');

        media_div.className = 'd-flex flex-row mb-3 tmdbrow';
        thumb_div.className = 'flex-shrink-0 align-self-start';
        descr_div.className = 'flex-grow-1 ms-3 align-self-center';
        radio_div.className = 'input-group-text';

        media_div.setAttribute('data-tmdbid', item['id'])
        
        img.src = item['poster_path'] != null ? 'https://image.tmdb.org/t/p/w92' + item['poster_path'] : '/images/placeholder-image.png';
        img.className = 'img-fluid';
        img.alt = 'Cover of ' + item['title'];
        img.style.width = '92px';

        link.innerText = item['title'];
        link.href = 'https://www.themoviedb.org/movie/' + item['id'];
        link.target = '_blank';
        heading.append(link);
        paragraph.innerText = item['overview'];
        release_date.innerText = "Release date: " + item['release_date'];

        radio_div.style.height = 'fit-content';
        radio.className = 'form-check-input tmdbradio';
        radio.type = 'radio';

        descr_div.append(heading, paragraph, release_date);
        thumb_div.append(img);
        radio_div.append(radio);
        media_div.append(thumb_div, descr_div, radio_div);
        media_div.addEventListener('click', selecttmdbitem);
        parent.append(media_div);
        return false;
    });
}

function processNetflixData(data) {
    let keys = Object.keys(data);
    let amount = document.getElementById('amounttoshow').value;
    keys.forEach((key, index) => {
        let row = document.createElement('tr');
        let indexcell = document.createElement('td');
        let netflix_name = document.createElement('td');

        let tmdb = document.createElement('td');
        let tmdb_div = document.createElement('div');
        let tmdb_cover_div = document.createElement('div');
        let tmdb_description_div = document.createElement('div');
        let tmdb_cover = document.createElement('img');
        let tmdb_cover_br = document.createElement('br');
        let tmdb_link = document.createElement('a');
        let description = document.createElement('b');
        let editbtn = document.createElement('button');
        let date = document.createElement('td');
        let paragraph = document.createElement('p');
        let release_date = document.createElement('p');


        netflix_name.innerText = data[key]['originalname'];
        indexcell.innerText = index + 1;

        row.className = 'netflixrow';
        if(document.getElementById('selectfilter').value == 'notfound') {
            if(data[key]['result'] != 'Unknown') {
                row.classList.add('d-none');
            } else {
                row.classList.remove('d-none');
            }
        } else if(index + 1 > amount) {
            row.classList.add('d-none');
        }
        row.id = index + 1;
        row.setAttribute('data-tmdbid', data[key]['result']['id']);
        
        release_date.className = 'mb-auto pb-3';
        
        editbtn.className = 'btn btn-success align-self-start';
        editbtn.innerHTML = '<i class="bi bi-pencil-square"></i>';
        editbtn.setAttribute('data-bs-toggle', 'modal');
        editbtn.setAttribute('data-bs-target', '#tmdbmodal');

        tmdb.className = 'w-50';
        tmdb_div.className = "row";
        tmdb_cover_div.className = 'col-md-3 justify-content-center';
        tmdb_description_div.className = 'col-md-9 text-start d-flex flex-column';
        tmdb_cover.style.width = '92px';
        tmdb_cover.alt = 'Movie poster of ' + (data[key]['result']['title'] ?? 'missing item');

        tmdb_link.target = '__blank';
        tmdb_cover.className = 'img-fluid';
        if(data[key]['result'] == 'Unknown' || data[key]['result']['poster_path'] == null) {
            tmdb_cover.src = '/images/placeholder-image.png';
            tmdb_link.innerText = 'Image not found on TMDB';
        } else {
            tmdb_cover.src = 'https://image.tmdb.org/t/p/w92' + data[key]['result']['poster_path'];
            tmdb_link.href = 'https://www.themoviedb.org/movie/' + data[key]['result']['id'];
            tmdb_link.innerText = data[key]['result']['title'];
        }

        if(data[key]['result'] == 'Unknown' || data[key]['result']['overview'] == null) {
            description.innerText = 'Description not found';
        } else {            
            description.innerText = 'Description: ';
            paragraph.innerText = data[key]['result']['overview'];
            release_date.innerText = 'Release date: ' + data[key]['result']['release_date'];
        }
        tmdb_description_div.append(description, paragraph, release_date);
        tmdb_description_div.append(editbtn);

        date.innerText = data[key]['date']['day'] + "/" + data[key]['date']['month'] + "/" + data[key]['date']['year'];

        tmdb_cover_div.append(tmdb_cover, tmdb_cover_br, tmdb_link);
        tmdb_div.append(tmdb_cover_div, tmdb_description_div);
        tmdb.append(tmdb_div);
        row.append(indexcell, date, netflix_name, tmdb);
        document.getElementById('netflixtbody').append(row);
    });
    if(document.getElementById('selectfilter').value == 'notfound') {
        createpagenav(amount, amount);
    } else {
        createpagenav(amount, keys.length);
    }
}

function processError(errorcode) {
    document.getElementById('netflixtbody').innerHTML = '';
    let errorrow = document.createElement('tr');
    let errorcell = document.createElement('td');
    errorcell.colSpan = 4;

    if(errorcode == 400) {
        errorcell.innerText = 'Error 400. Input file could not be processed. Please try again.';
    } else if(errorcode == 415) {
        errorcell.innerText = 'Error 415. Input file is the wrong type. Upload a CSV file from Netflix instead.';
    }

    errorrow.append(errorcell);
    document.getElementById('netflixtbody').append(errorrow);
}

function selecttmdbitem() {
    let radios = document.getElementsByClassName('tmdbradio');
    for(let i = 0; i < radios.length; i++) {
        radios[i].checked = false;
    }
    this.getElementsByClassName('tmdbradio')[0].checked = true;
}

function savetmdbitem() {
    let checkedrow = document.querySelector('input.tmdbradio:checked').closest('.tmdbrow');
    let rowid = document.getElementById('tmdbmodal').dataset.rowid;
    let targetrow = document.getElementById(rowid); 
    targetrow.getElementsByClassName('img-fluid')[0].src = checkedrow.getElementsByClassName('img-fluid')[0].src;
    targetrow.getElementsByTagName('a')[0].href = checkedrow.getElementsByTagName('a')[0].href;
    targetrow.getElementsByTagName('a')[0].innerText = checkedrow.getElementsByTagName('a')[0].innerText;
    targetrow.getElementsByTagName('p')[0].innerText = checkedrow.getElementsByTagName('p')[0].innerText;
    targetrow.getElementsByTagName('p')[1].innerText = checkedrow.getElementsByTagName('p')[1].innerText;
    targetrow.setAttribute('data-tmdbid', checkedrow.dataset.tmdbid);
    const modal = bootstrap.Modal.getInstance(document.getElementById('tmdbmodal'));
    modal.hide();
}

document.getElementById('tmdbmodal').addEventListener('show.bs.modal', event => {
  let button = event.relatedTarget;
  let id = button.closest('.netflixrow').id;
  document.getElementById('tmdbmodal').setAttribute('data-rowid', id);
})