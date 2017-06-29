var yo = require('yo-yo');


module.exports = function (dato) {
    return yo`<li class="current">
      <a class="menu-lateral btn-datos-ano" id='hideshow' href="#fb${dato.year}">${dato.year}</a>
      <div class="collapsible-header">
        <i class="fa fa-chevron-down rotate"  style="transition: all 2s linear;transform: rotate(0deg);float: right;font-size:12px;"></i>
      </div>
      <div class="collapsible-body">
        <ul class=" menu-lateral">

        </ul>
      </div>
    </li>`;
}
