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
    const agreeIdx = headers.indexOf('배정동의');

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

      // 배정 동의 기록 (agreeData가 있으면 기록)
      if (agreeIdx !== -1 && requestData.agree) {
        sheet.getRange(foundRowIndex, agreeIdx + 1).setValue("동의완료");
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
 * 성별 균형을 맞춰 하우스를 배정하는 함수 (수정됨)
 */
function getBalancedHouse(data, houseIdx, genderIdx, currentGender) {
  let edisonCount = 0;
  let teslaCount = 0;

  // 1. 현재 신청자의 성별을 표준화 (공백제거 + 자모분리 방지)
  const targetGender = String(currentGender).normalize('NFC').trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // 시트의 값들도 안전하게 변환
    const sheetGender = String(row[genderIdx] || "").normalize('NFC').trim();
    const sheetHouse = String(row[houseIdx] || "").trim().toUpperCase(); // 대소문자 무시

    // 2. 성별이 같은 사람들만 카운트
    if (sheetGender === targetGender) {
      if (sheetHouse === 'EDISON') {
        edisonCount++;
      } else if (sheetHouse === 'TESLA') {
        teslaCount++;
      }
    }
  }

  // 로그: 여기서 숫자가 제대로 나오는지 확인해야 합니다.
  console.log(`[배정체크] 신청자성별:${targetGender} | 현재상황 -> Edison:${edisonCount}명 vs Tesla:${teslaCount}명`);

  // 3. 적은 쪽으로 무조건 배정 (같을 때만 랜덤)
  if (edisonCount < teslaCount) return 'Edison';
  if (teslaCount < edisonCount) return 'Tesla';
  
  return Math.random() < 0.5 ? 'Edison' : 'Tesla';
} /* 응답 생성 함수
 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
/**
 * [진단 도구] 현재 시트의 데이터가 제대로 읽히는지 확인하는 함수
 * 이 함수를 선택하고 '실행'을 눌러 로그를 확인하세요.
 */
function testDiagnosis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // 1. 헤더 위치 확인
  const genderIdx = headers.indexOf('성별');
  const houseIdx = headers.indexOf('하우스');
  
  console.log(`[헤더점검] 성별 열 번호: ${genderIdx} (0부터 시작), 하우스 열 번호: ${houseIdx}`);
  
  if (genderIdx === -1 || houseIdx === -1) {
    console.error("🚨 오류: 헤더 이름을 찾을 수 없습니다! 시트의 1행에 '성별', '하우스'가 정확히 있는지(공백 확인) 보세요.");
    return;
  }

  // 2. 남/여 각각 카운트 테스트
  let mEdison = 0, mTesla = 0, fEdison = 0, fTesla = 0;
  let unknown = 0;

  console.log("----- 데이터 전수 조사 시작 -----");

  for (let i = 1; i < data.length; i++) {
    // 실제 배정 로직과 똑같이 데이터 가공
    const rawGender = data[i][genderIdx];
    const rawHouse = data[i][houseIdx];
    
    const gender = String(rawGender || "").normalize('NFC').trim();
    const house = String(rawHouse || "").trim().toUpperCase();

    if (house === "") continue; // 배정 안 된 사람은 패스

    if (gender === '남') { // 시트에 적힌게 '남'인지 '남자'인지 확인해서 수정 필요
      if (house === 'EDISON') mEdison++;
      else if (house === 'TESLA') mTesla++;
    } else if (gender === '여') {
      if (house === 'EDISON') fEdison++;
      else if (house === 'TESLA') fTesla++;
    } else {
      console.warn(`[주의] ${i+1}행의 성별을 인식 못함: "${rawGender}" (변환후: "${gender}")`);
      unknown++;
    }
  }

  console.log("----- 최종 진단 결과 -----");
  console.log(`👨 남자: Edison ${mEdison}명 vs Tesla ${mTesla}명`);
  console.log(`👩 여자: Edison ${fEdison}명 vs Tesla ${fTesla}명`);
  console.log(`❓ 성별 불명: ${unknown}명`);

  if (mEdison === 0 && mTesla === 0 && fEdison === 0 && fTesla === 0) {
    console.error("🚨 심각: 모든 카운트가 0입니다. 코드가 기존 데이터를 전혀 못 읽고 있습니다. (성별 텍스트 불일치 유력)");
  } else {
    console.log("✅ 코드는 정상적으로 숫자를 세고 있습니다. 1번(배포) 문제일 가능성이 높습니다.");
  }
}