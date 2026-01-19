import pandas as pd
import json
import os

# 1) 구글폼 응답(CSV) 불러오기

dataset_directory = r"C:/Users/sykim/Desktop/하우스추첨/test/"
csv_file = "test_survey.csv"

csv_path = os.path.join(dataset_directory, csv_file)
print("읽는 경로:", csv_path)

df = pd.read_csv(csv_path, encoding="utf-8-sig")
def assign_houses(data):
    male = data[data["성별"] == "남"].copy()
    female = data[data["성별"] == "여"].copy()

    # 2) 무작위 셔플
    male_list = male.sample(frac=1).reset_index(drop=True)
    female_list = female.sample(frac=1).reset_index(drop=True)

    def split_and_assign(group_df):
        mid = len(group_df) // 2
        edison = group_df.iloc[:mid].copy()
        tesla = group_df.iloc[mid:].copy()
        edison["house"] = "Edison"
        tesla["house"] = "Tesla"
        return pd.concat([edison, tesla], ignore_index=True)

    # 3) 남/여 각각 배정 후 합치기
    final_df = pd.concat([split_and_assign(male_list), split_and_assign(female_list)], ignore_index=True)
    return final_df

# 배정 실행
result = assign_houses(df)

# 4) 웹에서 사용할 JSON 저장
result_list = result.to_dict(orient="records")
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(result_list, f, ensure_ascii=False, indent=2)

print("✅ 배정 완료: data.json 생성됨")

