const API_URL = 'https://script.google.com/macros/s/AKfycbzmxSwqcYdU-_1YGG1JZI8smNFgLt_PF3YwaNbRiXNtHFw2ZdkWpQMd1s65hMAbuZ6QNA/exec'; 

// Star Background
function createStars() {
    const container = document.getElementById('starContainer');
    if (!container) return;
    
    // Increased star count for better effect
    const starCount = 80;
    
    for(let i=0; i<starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const duration = Math.random() * 3 + 2;
        const size = Math.random() * 2 + 1;
        
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
    
    const introSection = document.getElementById('introSection');
    const analyzingSection = document.getElementById('analyzingSection');
    const resultSection = document.getElementById('resultSection');

    // Validation
    if(!name || dob.length !== 8) {
        errorMsg.innerText = '이름과 생년월일(8자리)을 정확히 입력해주세요.';
        errorMsg.style.display = 'block';
        return;
    }

    // TRANSITION: Intro -> Analyzing
    errorMsg.style.display = 'none';
    introSection.style.display = 'none';
    analyzingSection.style.display = 'flex'; // Flex for centering

    try {
        // Create a promise that resolves after 2000ms (2 seconds)
        const delayPromise = new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch API
        const fetchPromise = fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ name: name, dob: dob })
        });

        // Wait for BOTH the delay and the fetch to complete
        const [_, response] = await Promise.all([delayPromise, fetchPromise]);
        const data = await response.json();

        // TRANSITION: Analyzing -> Result
        analyzingSection.style.display = 'none';

        if (data.result === 'success') {
            showResult(data.house);
        } else {
            // Error Handling: Go back to intro
            introSection.style.display = 'block';
            errorMsg.innerText = data.message || '정보를 찾을 수 없습니다.';
            errorMsg.style.display = 'block';
        }

    } catch (error) {
        console.error("Error:", error);
        analyzingSection.style.display = 'none';
        introSection.style.display = 'block';
        errorMsg.innerText = "서버 통신 중 오류가 발생했습니다.";
        errorMsg.style.display = 'block';
    }
}


function showResult(house) {
    const overlay = document.getElementById('resultOverlay');
    const sloganText = document.getElementById('sloganText');
    const congratsText = document.getElementById('congratsText');
    const resultImg = document.getElementById('resultHouseImg');
    const resultImgContainer = document.getElementById('resultImageContainer');
    const finalDetails = document.getElementById('finalDetails');

    // Reset Animation Classes
    overlay.classList.remove('visible');
    sloganText.classList.remove('reveal');
    sloganText.classList.remove('fade-out');
    congratsText.classList.remove('reveal'); 
    resultImgContainer.classList.remove('reveal');
    finalDetails.classList.remove('reveal');
    resultImg.className = 'house-img'; 

    let slogan = "";
    let congrats = "";
    let imgSrc = "";
    let houseClass = "";

    if (house === 'Edison') {
        slogan = "“천재는 1%의 영감과\n99%의 노력(땀)으로 이루어진다”";
        congrats = "축하합니다! 당신의 하우스는<br><span style='color:#ffd700'>에디슨 하우스</span>입니다";
        imgSrc = "src/에디슨 로고.png";
        houseClass = "edison";
    } else if (house === 'Tesla') {
        slogan = "“당신의 증오를 전기로 바꿀 수 있다면,\n온 세상을 밝힐 것이다.”";
        congrats = "축하합니다! 당신의 하우스는<br><span style='color:#00a4e3'>테슬라 하우스</span>입니다";
        imgSrc = "src/테슬라 로고.png";
        houseClass = "tesla";
    } else {
        slogan = "UNKNOWN HOUSE";
        imgSrc = ""; 
    }

    sloganText.innerText = slogan;
    congratsText.innerHTML = congrats; // Use innerHTML for styling spans
    resultImg.src = imgSrc;
    resultImg.classList.add(houseClass);

    // 1. Activate Overlay
    overlay.style.display = 'flex';

    // 2. Dip to Black 
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
    });

    // 3. Reveal Slogan (0.8s)
    setTimeout(() => {
        sloganText.classList.add('reveal');
    }, 800);

    // 4. Fade Out Slogan (3.5s)
    setTimeout(() => {
        sloganText.classList.remove('reveal');
        sloganText.classList.add('fade-out');
    }, 3800);

    // 5. Reveal Image & Congrats Text (4.5s)
    setTimeout(() => {
        congratsText.classList.add('reveal');
        resultImgContainer.classList.add('reveal');
    }, 4500);

    // 6. Show Final Details (5.5s)
    setTimeout(() => {
        finalDetails.classList.add('reveal');
    }, 5500);
}


function resetForm() {
    // Hide Overlay
    const overlay = document.getElementById('resultOverlay');
    overlay.style.display = 'none';
    overlay.classList.remove('visible');

    // Reset Sections
    document.getElementById('analyzingSection').style.display = 'none';
    document.getElementById('introSection').style.display = 'block';
    
    document.getElementById('studentName').value = '';
    document.getElementById('birthDate').value = '';
    document.getElementById('errorMsg').style.display = 'none';
}

window.addEventListener('load', createStars);
