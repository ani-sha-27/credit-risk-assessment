# Credit Risk Assessment (Loan Default Prediction)

A FastAPI service plus a web form that predicts whether a loan applicant is likely to default.
The model is a calibrated XGBoost pipeline trained in `Credit_Risk_ML.ipynb` (Google Colab). The API returns the default probability and a High Risk / Low Risk decision using a tuned threshold.

## Project structure

```
Credit Risk/
├── main.py                  # FastAPI app (API + serves the web page)
├── requirements.txt
├── credit_risk_model.pkl    # calibrated XGBoost pipeline (from the notebook)
├── best_threshold.pkl       # decision threshold (about 0.695)
├── Credit_Risk_ML.ipynb     # training notebook
├── credit_risk_dataset.csv
└── static/
    ├── index.html
    ├── style.css
    └── script.js
```

Do not edit or re-save the `.pkl` files. They must stay exactly as the notebook produced them.

## Setup (Windows PowerShell)

1. Use Python 3.12 or 3.13.
2. Create and activate a virtual environment:

```powershell
cd "E:\ML\Credit Risk"
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If scripts are blocked, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first.

3. Install the packages:

```powershell
python -m pip install -r requirements.txt
```

If pypi.org times out, add `-i https://pypi.tuna.tsinghua.edu.cn/simple`.

## Run

```powershell
uvicorn main:app --reload
```

- Web app: http://127.0.0.1:8000/
- Interactive API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

## API

`POST /predict`

```json
{
  "person_age": 30,
  "person_income": 50000,
  "person_home_ownership": "RENT",
  "person_emp_length": 4,
  "loan_intent": "PERSONAL",
  "loan_grade": "C",
  "loan_amnt": 10000,
  "loan_int_rate": 12.5,
  "loan_percent_income": 0.2,
  "cb_person_default_on_file": "N",
  "cb_person_cred_hist_length": 5
}
```

Response:

```json
{
  "default_probability": 0.0194,
  "default_prediction": 0,
  "threshold": 0.695,
  "Result": "Low Risk"
}
```

Allowed values:

| Field | Values |
|---|---|
| person_home_ownership | RENT, OWN, MORTGAGE, OTHER |
| loan_intent | PERSONAL, EDUCATION, MEDICAL, VENTURE, HOMEIMPROVEMENT, DEBTCONSOLIDATION |
| loan_grade | A to G |
| cb_person_default_on_file | Y, N |
| person_age | 18 to 100 |

`loan_percent_income` is `loan_amnt / person_income`. The web form calculates it for you. Invalid input returns a `422` error that names the field.

## How a decision is made

The calibrated model gives a probability of default. If it is at or above the threshold from `best_threshold.pkl`, the result is High Risk. The threshold was chosen in the notebook as the point with the best F1 score on calibrated probabilities.

## Troubleshooting

| Problem | Fix |
|---|---|
| `pip` is not recognized | Activate the venv, then use `python -m pip ...` |
| scikit-learn 1.6.1 will not install | Use Python 3.12 or 3.13, not 3.14 |
| `XGBoostError: input stream corrupted` | Install `xgboost==3.0.5` (already in requirements.txt) |
| `Directory 'static' does not exist` | Create the `static` folder next to `main.py` |
| Web page says it can't reach the API | Make sure `uvicorn main:app --reload` is running |

## Notes

- The model was saved with scikit-learn 1.6.1. A different version can warn or give wrong results, so keep the pinned versions.
- The model supports decisions as a screening aid only. It is not a final lending decision.
