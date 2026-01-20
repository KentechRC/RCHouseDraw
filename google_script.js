function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const requestData = JSON.parse(e.postData.contents);
    const name = requestData.name;
    const dob = requestData.dob ? String(requestData.dob) : null;

    if (!name || !dob) {
      return createResponse({ result: 'error', message: '잘못된 요청입니다.' });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 컬럼 인덱스 찾기 (헤더 이름이 정확해야 함: 이름, 생년월일, 성별, 하우스, 확인시간)
    const nameIdx = headers.indexOf('이름');
    const dobIdx = headers.indexOf('생년월일'); 
    const genderIdx = headers.indexOf('성별');
    const houseIdx = headers.indexOf('하우스');
    const timeIdx = headers.indexOf('확인시간');

    if (nameIdx === -1 || dobIdx === -1) {
      return createResponse({ result: 'error', message: '시트 형식이 올바르지 않습니다.' });
    }

    let foundRowIndex = -1;
    let studentData = null;

    // 학생 검색
    for (let i = 1; i < data.length; i++) {
      // 데이터 타입 일치를 위해 String으로 변환 비교
      if (String(data[i][nameIdx]) === name && String(data[i][dobIdx]) === dob) {
        foundRowIndex = i + 1; // 1-based index for getRange
        studentData = data[i];
        break;
      }
    }

    if (foundRowIndex === -1) {
      return createResponse({ result: 'error', message: '일치하는 학생 정보가 없습니다.' });
    }

    let assignedHouse = studentData[houseIdx];

    // 하우스가 없으면 새로 배정
    if (!assignedHouse) {
      assignedHouse = assignRandomHouse(sheet, houseIdx);
      
      // 시트에 저장
      sheet.getRange(foundRowIndex, houseIdx + 1).setValue(assignedHouse);
      
      // 타임스탬프 저장 (이미 값이 없을 때만)
      if (timeIdx !== -1 && !studentData[timeIdx]) {
        sheet.getRange(foundRowIndex, timeIdx + 1).setValue(new Date().toLocaleString());
      }
    }

    return createResponse({ 
      result: 'success', 
      house: assignedHouse,
      name: name 
    });

  } catch (error) {
    return createResponse({ result: 'error', message: error.toString() });
  }
}

function assignRandomHouse(sheet, houseIdx) {
  const data = sheet.getDataRange().getValues();
  let edisonCount = 0;
  let teslaCount = 0;

  // 1행(헤더) 제외하고 카운트
  for (let i = 1; i < data.length; i++) {
    const house = data[i][houseIdx];
    if (house === 'Edison') edisonCount++;
    else if (house === 'Tesla') teslaCount++;
  }

  // 단순 성비/비율 균형 로직 (랜덤성을 가미하되 적은 쪽으로 유도)
  // 차이가 2명 이상 나면 적은 쪽으로 강제 배정, 아니면 50:50
  if (edisonCount > teslaCount + 2) {
    return 'Tesla';
  } else if (teslaCount > edisonCount + 2) {
    return 'Edison';
  } else {
    return Math.random() < 0.5 ? 'Edison' : 'Tesla';
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // 헤더가 없으면 생성
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['이름', '생년월일', '성별', '하우스', '확인시간']);
  }
}
