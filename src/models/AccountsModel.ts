import { RootModel } from "./RootModel";
// import { persistStore } from "../utils/mobx-persist.utils";
import { action, computed, makeAutoObservable, observable } from "mobx";
import { AccountModel } from "./AccountModel";
import { Cashify } from "cashify";
import { Options } from "cashify/dist/lib/options";
import currencyJS from "currency.js";
import getSymbolFromCurrency from "currency-symbol-map";

export interface IRates {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

export class SelectedAccounts {
  public from?: AccountModel | null;
  public to?: AccountModel | null;
  constructor(data: SelectedAccounts) {
    this.from = data.from;
    this.to = data.to;

    makeAutoObservable(this, {
      from: observable,
      to: observable,
    });
  }
}

export class AccountsModel {
  rootModel: RootModel;
  public accounts: AccountModel[];
  public ratesData: IRates | null;
  public selectedAccounts: SelectedAccounts;
  public cashify: Cashify | null;
  public inputFromValue: string | number;
  public inputToValue: string | number;
  constructor(rootModel: RootModel) {
    this.rootModel = rootModel;
    this.selectedAccounts = new SelectedAccounts({ from: null, to: null });
    this.accounts = [];
    this.ratesData = null;
    this.cashify = null;
    this.inputToValue = "";
    this.inputFromValue = "";
    makeAutoObservable(this, {
      rootModel: false,
      cashify: false,
      accounts: observable,
      selectedAccounts: observable,
      inputFromValue: observable,
      inputToValue: observable,
      ratesData: observable,
      accountsAsArray: computed,
      setSelectedAccounts: action,
      updateInputFromValue: action,
      updateInputToValue: action,
    });

    // INIT Module
    // this.init();
    // persistStore(
    //   this,
    //   ["accounts", "selectedAccount", "accountsAsArray"],
    //   "AccountsModel",
    // );
  }

  public init = async (): Promise<void> => {
    try {
      const data = await this.rootModel.ApiModel.getLatestRatesRequest(
        ["USD", "EUR", "GBP", "UAH"],
        "USD",
      );
      if (data) {
        this.setRatesData(data);
        this.setAccounts(data);
        this.initCachify(data);
      }
    } catch (error) {
      console.error("init", error);
    }
  };

  public initCachify = (ratesData: IRates): void => {
    this.cashify = new Cashify({
      base: ratesData.base,
      rates: ratesData.rates,
    });
  };

  public setSelectedAccounts = (data: {
    fromId?: string;
    toId?: string;
  }): void => {
    if (data.fromId) {
      this.selectedAccounts.from = data.fromId
        ? this.getAccountById(data.fromId)
        : null;
    }
    if (data.toId) {
      this.selectedAccounts.to = data.toId
        ? this.getAccountById(data.toId)
        : null;
    }
  };

  public get accountsAsArray(): AccountModel[] {
    return this.accounts.slice();
  }

  public setRatesData = (ratesData: IRates): void => {
    this.ratesData = ratesData;
  };

  public setAccounts = (ratesData: IRates): void => {
    Object.keys(ratesData.rates).forEach((currency: string) => {
      this.accounts.push(
        new AccountModel({
          currency,
          balance: 100,
        }),
      );
    });
  };

  public getAccountById = (id: string): AccountModel | undefined => {
    return this.accounts.find((account: AccountModel) => account.id === id);
  };

  public convertCurrency = (
    amount: number | string,
    options?: Partial<Options>,
  ): number => {
    return Number(this.cashify?.convert(amount, options).toFixed(2));
  };

  public formatCurrency = (
    value: currency.Any,
    currencyName: string,
  ): string => {
    return currencyJS(value, {
      symbol: getSymbolFromCurrency(currencyName),
    }).format();
  };

  public exchange = (): void => {
    this.selectedAccounts?.from?.updateBalance(
      this.selectedAccounts?.from?.balance - Number(this.inputFromValue),
    );

    this.selectedAccounts?.to?.updateBalance(
      this.selectedAccounts?.to?.balance + Number(this.inputToValue),
    );
  };

  public updateInputFromValue = (value: string | number): void => {
    this.inputFromValue = value ? value : "";
  };

  public updateInputToValue = (value: string | number): void => {
    this.inputToValue = value ? value : "";
  };
}
