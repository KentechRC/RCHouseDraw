const API_URL = 'https://script.google.com/macros/s/AKfycbzmxSwqcYdU-_1YGG1JZI8smNFgLt_PF3YwaNbRiXNtHFw2ZdkWpQMd1s65hMAbuZ6QNA/exec'; 

// Initial Star Background Generation
function createStars() {
    const container = document.getElementById('starContainer');
    // Ensure container exists
    if (!container) return;
    
    const starCount = 50;
    
    for(let i=0; i<starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const duration = Math.random() * 3 + 2;
        const size = Math.random() * 3 + 1;
        
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.setProperty('--duration', `${duration}s`);
        star.style.animationDelay = `${Math.random() * 5}s`;
        
        container.appendChild(star);
    }
}

async function checkHouse() {
    const name = document.getElementById('studentName').value.trim();
    const dob = document.getElementById('birthDate').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const inputSection = document.getElementById('inputSection');
    const resultSection = document.getElementById('resultSection');
    const edisonCard = document.getElementById('edisonCard');
    const teslaCard = document.getElementById('teslaCard');

    // Simple Validation
    if(!name || dob.length !== 8) {
        alert('이름과 생년월일(8자리)을 정확히 입력해주세요.');
        return;
    }

    // UI Transition
    errorMsg.style.display = 'none';
    inputSection.style.display = 'none';
    loader.style.display = 'block';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ name: name, dob: dob })
        });

        const data = await response.json();
        
        loader.style.display = 'none';

        if (data.result === 'success') {
            resultSection.style.display = 'block';
            
            // Hide Input
            inputSection.style.display = 'none';

            if (data.house === 'Edison') {
                edisonCard.style.display = 'block';
                teslaCard.style.display = 'none';
            } else if (data.house === 'Tesla') {
                teslaCard.style.display = 'block';
                edisonCard.style.display = 'none';
            }
        } else {
            // Not Found or Error
            inputSection.style.display = 'block';
            errorMsg.innerText = data.message || '정보를 찾을 수 없습니다.';
            errorMsg.style.display = 'block';
        }

    } catch (error) {
        console.error("Error:", error);
        loader.style.display = 'none';
        inputSection.style.display = 'block';
        alert("서버 통신 중 오류가 발생했습니다.");
    }
}

// remove recordConfirmationTime as the server handles existing logic
// function recordConfirmationTime... removed

function resetForm() {
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('inputSection').style.display = 'block';
    document.getElementById('studentName').value = '';
    document.getElementById('birthDate').value = '';
    document.getElementById('errorMsg').style.display = 'none';
    document.getElementById('edisonCard').style.display = 'none';
    document.getElementById('teslaCard').style.display = 'none';
}

// Initialize on load
window.addEventListener('load', createStars);
