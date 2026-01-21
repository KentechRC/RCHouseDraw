/**
 * 웹 앱으로 배포하여 POST 요청을 받는 메인 함수
 */
function doPost(e) {
  // 동시 접속으로 인한 인원 카운트 오류 방지를 위해 '잠금' 설정
  const lock = LockService.getScriptLock();
  try {
    // 최대 30초 동안 대기하며 순서가 오면 실행
    lock.waitLock(30000);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const requestData = JSON.parse(e.postData.contents);
    
    const name = requestData.name ? String(requestData.name).trim() : null;
    const dob = requestData.dob ? String(requestData.dob).trim() : null;

    if (!name || !dob) {
      return createResponse({ result: 'error', message: '이름과 생년월일이 누락되었습니다.' });
    }

    // 시트의 모든 데이터를 가져옵니다.
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const nameIdx = headers.indexOf('이름');
    const dobIdx = headers.indexOf('생년월일'); 
    const genderIdx = headers.indexOf('성별');
    const houseIdx = headers.indexOf('하우스');
    const timeIdx = headers.indexOf('확인시간');

    if (nameIdx === -1 || dobIdx === -1 || genderIdx === -1 || houseIdx === -1) {
      return createResponse({ result: 'error', message: '시트 헤더 설정이 올바르지 않습니다.' });
    }

    let foundRowIndex = -1;
    let studentData = null;

    // 1. 학생 검색
    for (let i = 1; i < data.length; i++) {
      const sName = String(data[i][nameIdx]).trim();
      const sDob = String(data[i][dobIdx]).trim();
      
      if (sName === name && sDob === dob) {
        foundRowIndex = i + 1;
        studentData = data[i];
        break;
      }
    }

    if (foundRowIndex === -1) {
      return createResponse({ result: 'error', message: '일치하는 학생 정보가 없습니다.' });
    }

    let assignedHouse = studentData[houseIdx] ? String(studentData[houseIdx]).trim() : "";
    const currentGender = String(studentData[genderIdx]).trim();

    // 2. 하우스가 비어있을 때만 배정 실행
    if (!assignedHouse || assignedHouse === "") {
      assignedHouse = getBalancedHouse(data, houseIdx, genderIdx, currentGender);
      
      // 시트에 즉시 기록
      sheet.getRange(foundRowIndex, houseIdx + 1).setValue(assignedHouse);
      
      if (timeIdx !== -1) {
        sheet.getRange(foundRowIndex, timeIdx + 1).setValue(new Date().toLocaleString('ko-KR'));
      }
      
      // 기록이 시트에 반영되도록 강제 적용
      SpreadsheetApp.flush();
    }

    return createResponse({ 
      result: 'success', 
      name: name,
      house: assignedHouse,
      gender: currentGender
    });

  } catch (error) {
    return createResponse({ result: 'error', message: error.toString() });
  } finally {
    // 작업이 끝나면 잠금 해제
    lock.releaseLock();
  }
}

/**
 * 성별 균형을 맞춰 하우스를 배정하는 함수
 */
function getBalancedHouse(data, houseIdx, genderIdx, currentGender) {
  const counts = {
    'Edison': 0,
    'Tesla': 0
  };

  // 1. 시트를 돌며 '같은 성별'의 하우스별 인원을 정확히 카운트
  for (let i = 1; i < data.length; i++) {
    const house = String(data[i][houseIdx]).trim();
    const gender = String(data[i][genderIdx]).trim();

    if (gender === currentGender) {
      if (house === 'Edison') counts['Edison']++;
      else if (house === 'Tesla') counts['Tesla']++;
    }
  }

  // 2. 인원 비교 배정
  if (counts['Edison'] > counts['Tesla']) {
    return 'Tesla';
  } else if (counts['Tesla'] > counts['Edison']) {
    return 'Edison';
  } else {
    // 인원이 같으면 완전 랜덤
    return Math.random() < 0.5 ? 'Edison' : 'Tesla';
  }
}

/**
 * 응답 생성 함수
 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}