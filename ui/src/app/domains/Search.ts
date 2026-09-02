export class Search {

  searchText:string = "";
  searchResults:SearchResult[] = [];
}

export class SearchResult {
  searchType:string = "";
  readableText:string = "";
  data:any;
}
