from abc import ABC, abstractmethod
import math
import numpy as np

class ForecastResult:
    def __init__(self, forecast_m1: float, forecast_m2: float, forecast_m3: float, ci_lower: float, ci_upper: float, confidence: int):
        self.forecast_m1 = forecast_m1
        self.forecast_m2 = forecast_m2
        self.forecast_m3 = forecast_m3
        self.ci_lower = ci_lower
        self.ci_upper = ci_upper
        self.confidence = confidence # Percent 0-100

class IForecaster(ABC):
    @abstractmethod
    def forecast(self, sales_history: dict[str, float]) -> ForecastResult:
        pass

class MovingAverageForecaster(IForecaster):
    def forecast(self, sales_history: dict[str, float]) -> ForecastResult:
        # Sort sales history by month chronological key
        sorted_keys = sorted(sales_history.keys())
        sales = [sales_history[k] for k in sorted_keys]
        
        if not sales:
            return ForecastResult(0, 0, 0, 0, 0, 50)
            
        if len(sales) < 3:
            # Fallback when there is not enough history
            avg = sum(sales) / len(sales)
            return ForecastResult(round(avg, 2), round(avg, 2), round(avg, 2), round(avg * 0.8, 2), round(avg * 1.2, 2), 60)
            
        # 3-month moving average
        recent_sales = sales[-3:]
        avg = sum(recent_sales) / 3
        
        # Calculate standard deviation of historical sales to estimate CI
        mean = sum(sales) / len(sales)
        variance = sum((x - mean) ** 2 for x in sales) / len(sales)
        std_dev = math.sqrt(variance)
        
        ci_margin = 1.96 * std_dev
        ci_lower = max(0.0, avg - ci_margin)
        ci_upper = avg + ci_margin
        
        # Forecast confidence based on coefficient of variation (lower variance -> higher confidence)
        if mean > 0:
            cv = std_dev / mean
            confidence = max(50, min(95, int(100 - (cv * 40))))
        else:
            confidence = 50
            
        return ForecastResult(
            forecast_m1=round(avg, 2),
            forecast_m2=round(avg, 2),
            forecast_m3=round(avg, 2),
            ci_lower=round(ci_lower, 2),
            ci_upper=round(ci_upper, 2),
            confidence=confidence
        )

class LinearRegressionForecaster(IForecaster):
    def forecast(self, sales_history: dict[str, float]) -> ForecastResult:
        sorted_keys = sorted(sales_history.keys())
        sales = [sales_history[k] for k in sorted_keys]
        
        if not sales:
            return ForecastResult(0, 0, 0, 0, 0, 50)
            
        n = len(sales)
        if n < 3:
            avg = sum(sales) / n
            return ForecastResult(round(avg, 2), round(avg, 2), round(avg, 2), round(avg * 0.8, 2), round(avg * 1.2, 2), 60)
            
        # Solve y = ax + b using Linear Regression
        x = np.arange(n)
        y = np.array(sales)
        
        # polyfit fits model
        a, b = np.polyfit(x, y, 1)
        
        # Predict month+1, month+2, month+3
        m1 = max(0.0, a * n + b)
        m2 = max(0.0, a * (n + 1) + b)
        m3 = max(0.0, a * (n + 2) + b)
        
        # Calculate standard error of estimate (residuals standard deviation)
        y_pred = a * x + b
        residuals = y - y_pred
        std_error = np.std(residuals)
        
        # 95% Confidence Interval for predictions
        ci_margin = 1.96 * std_error
        ci_lower = max(0.0, m1 - ci_margin)
        ci_upper = m1 + ci_margin
        
        # Calculate R-squared to determine model forecast confidence
        y_mean = np.mean(y)
        if y_mean > 0:
            ss_tot = np.sum((y - y_mean) ** 2)
            ss_res = np.sum(residuals ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
            
            # Confidence score is higher if linear model fits well (high R-squared)
            confidence = max(50, min(98, int(60 + (r_squared * 38))))
        else:
            confidence = 50
            
        return ForecastResult(
            forecast_m1=round(m1, 2),
            forecast_m2=round(m2, 2),
            forecast_m3=round(m3, 2),
            ci_lower=round(ci_lower, 2),
            ci_upper=round(ci_upper, 2),
            confidence=confidence
        )
