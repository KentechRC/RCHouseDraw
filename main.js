const API_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE'; 

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
        // TODO: Replace with actual fetch call
        // const response = await fetch(`${API_URL}?name=${name}&dob=${dob}`);
        // const data = await response.json();
        
        // MOCKING DATA FOR DEMO for the USER
        // Remove this block when real API is ready
        await new Promise(r => setTimeout(r, 1500)); // Simulate network delay
        
        let data = null;
        // Demo logic
        if (name === "테스트" || name === "Test") {
            if (dob === "20050101") data = { house: "Edison", row: 1, name: name };
            else if (dob === "20050102") data = { house: "Tesla", row: 2, name: name };
        }
        
        // End of Mock

        loader.style.display = 'none';

        if (data) {
            resultSection.style.display = 'block';
            if (data.house === 'Edison') {
                edisonCard.style.display = 'block';
                teslaCard.style.display = 'none';
            } else if (data.house === 'Tesla') {
                teslaCard.style.display = 'block';
                edisonCard.style.display = 'none';
            }
            
            // Record check time
            recordConfirmationTime(data.row);
        } else {
            // Not Found
            inputSection.style.display = 'block';
            errorMsg.style.display = 'block';
        }

    } catch (error) {
        console.error("Error:", error);
        loader.style.display = 'none';
        inputSection.style.display = 'block';
        alert("오류가 발생했습니다. 나중에 다시 시도해주세요.");
    }
}

async function recordConfirmationTime(rowNum) {
    if (API_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') return; // Skip if no API

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // Google Scripts often needs this for simple posts
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ row: rowNum, timestamp: new Date().toISOString() })
        });
        console.log("Time recorded for row:", rowNum);
    } catch (e) {
        console.log("Failed to record time", e);
    }
}

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
