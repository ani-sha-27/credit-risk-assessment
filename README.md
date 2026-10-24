# Credit Risk Assessment

I built this to predict whether a loan applicant is likely to default. You fill in the applicant's details on a web page and it gives back a default probability and a High Risk or Low Risk label.

The model was trained in Google Colab (`Credit_Risk_ML.ipynb`) on a public credit risk dataset of about 32,000 loans. I compared Logistic Regression with XGBoost. XGBoost did clearly better (test ROC-AUC 0.95 against 0.88), so I tuned it with RandomizedSearchCV, calibrated its probabilities, and used SHAP in the notebook to see which features push a prediction up or down. After that I wrapped the saved model in a FastAPI app and put a small HTML/CSS/JS page on top of it.

## How the decision is made

The model outputs a probability of default. If it is 0.695 or higher, the result is High Risk, otherwise Low Risk. I got that number from the precision-recall curve on the calibrated probabilities. It's the point where F1 is highest, and it is saved in `best_threshold.pkl`. The default 0.5 isn't automatically the right cutoff when one class is much rarer than the other.

One thing I noticed when running the model over the whole dataset: most predictions come out either very low or very high, and only about 6% land between 25% and 65%. So the dial on the page usually sits near one edge.

## Running it

You need Python 3.12 or 3.13. I used 3.13 on Windows.

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

Then open http://127.0.0.1:8000/ for the web page, or http://127.0.0.1:8000/docs to try the API directly.

If pypi.org times out for you, add `-i https://pypi.tuna.tsinghua.edu.cn/simple` to the pip command. That's what I had to do.

Files:

```
main.py                  FastAPI app, also serves the web page
requirements.txt
credit_risk_model.pkl    calibrated XGBoost pipeline from the notebook
best_threshold.pkl       the 0.695 cutoff
Credit_Risk_ML.ipynb     training notebook
credit_risk_dataset.csv
static/                  index.html, style.css, script.js
```

## The API

`POST /predict` with:

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

and you get back:

```json
{
  "default_probability": 0.0194,
  "default_prediction": 0,
  "threshold": 0.695,
  "Result": "Low Risk"
}
```

`loan_percent_income` is just `loan_amnt / person_income`. The web page works it out for you, but the API expects it.

Home ownership can be RENT, OWN, MORTGAGE or OTHER. Loan intent can be PERSONAL, EDUCATION, MEDICAL, VENTURE, HOMEIMPROVEMENT or DEBTCONSOLIDATION. Loan grade is A to G, past default is Y or N, and age must be 18 to 100. Anything outside those values gets a 422 error that names the field.

## Problems I ran into

- scikit-learn 1.6.1 wouldn't install on Python 3.14, so I switched to 3.13.
- With XGBoost 3.4.1 the model failed to load on my Windows machine with `XGBoostError: input stream corrupted`, even though the file was fine (I checked its hash). Installing `xgboost==3.0.5` fixed it. I compared the two versions on 2,000 rows and the probabilities differed by about 0.000004, so it makes no practical difference. You may see an XGBoost warning about this when the app starts. It's harmless.
- The pickle files were saved with scikit-learn 1.6.1, so I pinned that version. A different one can warn or quietly give different results.
- I didn't touch the notebook or the pkl files while building the API, and they shouldn't be re-saved.

## Limits

This is a learning project. It shouldn't be used to make real lending decisions. The model only knows the historical data it was trained on, and I haven't checked it for fairness across groups.