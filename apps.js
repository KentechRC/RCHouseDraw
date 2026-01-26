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
    const seqIdx = headers.indexOf('배정순번');
    
    // IP 주소 열 찾기 (없으면 -1)
    let ipIdx = headers.indexOf('IP주소');
    if (ipIdx === -1) ipIdx = headers.indexOf('IP'); // 영문 헤더 대비

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
    const isAlreadyAssigned = (assignedHouse !== "");
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

      // IP 주소 기록 (Frontend에서 보낸 userIP)
      if (ipIdx !== -1 && requestData.userIP) {
        sheet.getRange(foundRowIndex, ipIdx + 1).setValue(requestData.userIP);
      }
      
// (2) [핵심 기능] 순번 및 현황 기록: "00 E(남,여) T(남,여)"
      if (seqIdx !== -1) {
        // 통계 변수 초기화
        let maxSeq = 0;
        let countStats = { 'E_M': 0, 'E_F': 0, 'T_M': 0, 'T_F': 0 };

        // 전체 데이터를 순회하며 현재 상태 집계 (나 자신 제외하고 카운트)
        for (let i = 1; i < data.length; i++) {
          // 지금 처리 중인 '나'는 데이터(data) 배열에는 아직 하우스가 없으므로 건너뜀
          if (i === foundRowIndex - 1) continue;

          // 기존 데이터 통계 내기
          const rGender = String(data[i][genderIdx] || "").normalize('NFC').trim();
          const rHouse = String(data[i][houseIdx] || "").toUpperCase().trim();

          if (rHouse === 'EDISON') {
            if (rGender === '남' || rGender === '남자') countStats.E_M++;
            else if (rGender === '여' || rGender === '여자') countStats.E_F++;
          } else if (rHouse === 'TESLA') {
            if (rGender === '남' || rGender === '남자') countStats.T_M++;
            else if (rGender === '여' || rGender === '여자') countStats.T_F++;
          }

          // 순번 최대값 찾기 (형식이 "12 E(...)" 이므로 앞의 숫자만 추출)
          const seqCell = String(data[i][seqIdx] || "").trim();
          const seqNum = parseInt(seqCell.split(' ')[0]); // 공백 기준 앞부분만 가져옴
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }

        // '나'의 배정 결과 통계에 반영
        if (assignedHouse.toUpperCase() === 'EDISON') {
          if (currentGender === '남' || currentGender === '남자') countStats.E_M++;
          else countStats.E_F++;
        } else { // TESLA
          if (currentGender === '남' || currentGender === '남자') countStats.T_M++;
          else countStats.T_F++;
        }

        // 최종 문자열 생성
        const newSeq = maxSeq + 1;
        // 포맷: "00 E(남,여) T(남,여)"
        const logString = `${newSeq} E(${countStats.E_M},${countStats.E_F}) T(${countStats.T_M},${countStats.T_F})`;

        // 시트에 기록
        sheet.getRange(foundRowIndex, seqIdx + 1).setValue(logString);
      }
      
      // 변경 사항 즉시 반영
      SpreadsheetApp.flush();
    }
    return createResponse({ 
      result: 'success', 
      name: name,
      house: assignedHouse,
      gender: currentGender,
      isAlreadyAssigned: isAlreadyAssigned
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

  return Math.random() < 0.5 ? 'Edison' : 'Tesla';
}

/**
 * 응답 생성 함수
 */

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
