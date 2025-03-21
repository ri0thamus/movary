const tmdbApiKeyInput = document.getElementById('tmdbApiKeyInput');
const applicationUrlInput = document.getElementById('applicationUrlInput');

document.getElementById('generalServerUpdateButton').addEventListener('click', async () => {
    tmdbApiKeyInput.classList.remove('invalid-input');
    applicationUrlInput.classList.remove('invalid-input');

    let tmdbApiKeyInputValue = null;

    if (tmdbApiKeyInput.disabled === false) {
        tmdbApiKeyInputValue = tmdbApiKeyInput.value;

        if (tmdbApiKeyInputValue === '') {
            addAlert('alertGeneralServerDiv', 'TMDB API Key is not set', 'danger');
            tmdbApiKeyInput.classList.add('invalid-input');

            return;
        }
    }

    if (applicationUrlInput.value !== '') {
        if (isValidUrl(applicationUrlInput.value) === false) {
            addAlert('alertGeneralServerDiv', 'Application url not a valid url. Valid example: http://localhost', 'danger');
            applicationUrlInput.classList.add('invalid-input');
            return;
        }
    }

    const response = await updateGeneral(tmdbApiKeyInputValue, applicationUrlInput.value);

    switch (response.status) {
        case 200:
            addAlert('alertGeneralServerDiv', 'Update was successful', 'success');

            return;
        case 400:
            const errorMessage = await response.text();

            tmdbApiKeyInput.classList.add('invalid-input');
            addAlert('alertGeneralServerDiv', errorMessage, 'danger');

            return;
        default:
            addAlert('alertGeneralServerDiv', 'Unexpected server error', 'danger');
    }
});

function updateGeneral(tmdbApiKey, applicationUrl) {
    return fetch('/settings/server/general', {
        method: 'POST', headers: {
            'Content-Type': 'application/json'
        }, body: JSON.stringify({
            'tmdbApiKey': tmdbApiKey,
            'applicationUrl': applicationUrl
        })
    });
}

function isValidUrl(urlString) {
    try {
        new URL(urlString);
        return true;
    } catch (err) {
        return false;
    }
}

